#!/usr/bin/env sh
set -eu

CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}
if [ "$(basename "$CONTAINER_DIR")" = "scripts" ]; then
  CONTAINER_DIR=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
fi
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=$CONTAINER_DIR/deploy.env

env_value() {
  key="$1"
  value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  value=$(printf "%s" "$value" | tr -d '\r')
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf "%s" "$value"
}

require_env_value() {
  key="$1"
  value=$(env_value "$key")
  [ -n "$value" ] || {
    echo "$key is required in $DEPLOY_ENV." >&2
    exit 78
  }
}

prepare_deploy_env() {
  [ -f "$DEPLOY_ENV" ] || {
    echo "Missing deployment environment: $DEPLOY_ENV" >&2
    echo "Run bash prepare-env.sh from the repository root." >&2
    exit 78
  }
}

validate_deploy_env() {
  for key in \
    NODE_ENV NODE_RUNTIME_VERSION NPM_RUNTIME_VERSION NGINX_BASE_IMAGE CXSUN_VERSION \
    CXSUN_IMAGE_REGISTRY CXSUN_DOCKER_NETWORK CXSUN_BIND_ADDRESS \
    CXSUN_TENANCY_MODE MARIADB_BASE_IMAGE MARIADB_IMAGE_TAG \
    MARIADB_ROOT_PASSWORD MARIADB_BIND_ADDRESS MARIADB_HOST_PORT \
    MARIADB_DATA_VOLUME MARIADB_BACKUP_VOLUME DB_DRIVER DB_HOST DB_PORT \
    DB_USER DB_PASSWORD DB_MASTER_NAME REDIS_BASE_IMAGE REDIS_IMAGE_TAG \
    REDIS_PASSWORD REDIS_HOST_PORT REDIS_DATA_VOLUME CXSUN_QUEUE_BACKEND \
    CXSUN_REDIS_URL CXSUN_QUEUE_WORKER_ENABLED FILEBROWSER_BASE_IMAGE \
    MEDIA_IMAGE_TAG MEDIA_HOST_PORT MEDIA_ADMIN_USER MEDIA_ADMIN_PASSWORD \
    MEDIA_DATA_VOLUME MEDIA_DB_VOLUME BILLING_STACK_API_IMAGE_TAG \
    BILLING_STACK_WEB_IMAGE_TAG BILLING_STACK_MIGRATIONS_IMAGE_TAG \
    BILLING_STACK_DATA_VOLUME JWT_SECRET AUTH_MODE AUTH_SESSION_TTL_HOURS \
    AUTH_SESSION_RENEWAL_HOURS PLATFORM_API_PORT PLATFORM_WEB_PORT \
    PLATFORM_WEB_ORIGIN CXSUN_WEB_HOST \
    CXSUN_WEB_HOST_ALT CXSUN_MEDIA_HOST SUPER_ADMIN_NAME \
    SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD SOFTWARE_ADMIN_NAME \
    SOFTWARE_ADMIN_EMAIL SOFTWARE_ADMIN_PASSWORD TENANT_ADMIN_NAME \
    TENANT_ADMIN_EMAIL TENANT_ADMIN_PASSWORD CXSUN_DB_FRESH_ON_START \
    CXSUN_ALLOW_PRODUCTION_DB_RESET CXSUN_VERIFIED_BACKUP_ID \
    ENABLE_DEFAULT_TENANT_SEED \
    DEFAULT_TENANT_CORPORATE_ID DEFAULT_TENANT_DB_NAME DEFAULT_TENANT_DOMAIN \
    DEFAULT_TENANT_NAME DEFAULT_TENANT_SLUG DEFAULT_TENANT_ADMIN_NAME \
    DEFAULT_TENANT_ADMIN_EMAIL DEFAULT_TENANT_ADMIN_PASSWORD TENANT_DOMAIN_BASE; do
    require_env_value "$key"
  done

  [ "$(env_value CXSUN_DB_FRESH_ON_START)" = "0" ] || {
    echo "CXSUN_DB_FRESH_ON_START must remain 0 for deployment." >&2
    exit 78
  }
  [ "$(env_value CXSUN_ALLOW_PRODUCTION_DB_RESET)" = "0" ] || {
    echo "CXSUN_ALLOW_PRODUCTION_DB_RESET must remain 0 for deployment." >&2
    exit 78
  }
  [ "$(env_value DB_MASTER_NAME)" != "$(env_value DEFAULT_TENANT_DB_NAME)" ] || {
    echo "DB_MASTER_NAME and DEFAULT_TENANT_DB_NAME must be different databases." >&2
    exit 78
  }
  [ "$(env_value NODE_ENV)" = "production" ] || {
    echo "NODE_ENV must be production for container deployment." >&2
    exit 78
  }

  if [ "$(env_value MAIL_ENABLED)" = "1" ]; then
    require_env_value MAIL_SMTP_HOST
    require_env_value MAIL_FROM_EMAIL
    if [ "$(env_value MAIL_SMTP_PORT)" = "465" ] && [ "$(env_value MAIL_SMTP_SECURE)" != "1" ]; then
      echo "MAIL_SMTP_SECURE must be 1 when MAIL_SMTP_PORT is 465." >&2
      exit 78
    fi
  fi

  case "$(env_value CXSUN_TENANCY_MODE)" in
    single)
      require_env_value CXSUN_SINGLE_TENANT_CORPORATE_ID
      if [ "$(env_value ENABLE_DEFAULT_TENANT_SEED)" = "1" ] && \
        [ "$(env_value CXSUN_SINGLE_TENANT_CORPORATE_ID)" != "$(env_value DEFAULT_TENANT_CORPORATE_ID)" ]; then
        echo "The default tenant and configured single tenant must match." >&2
        exit 78
      fi
      ;;
    multi) ;;
    *) echo "CXSUN_TENANCY_MODE must be single or multi." >&2; exit 78 ;;
  esac
}

require_docker() {
  docker info >/dev/null 2>&1 || {
    echo "Docker Engine is not reachable." >&2
    exit 69
  }
  docker compose version >/dev/null 2>&1 || {
    echo "Docker Compose v2 is required." >&2
    exit 69
  }
}

container_is_compose_service() {
  container="$1"
  project="$2"
  service="$3"
  [ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' \
    "$container" 2>/dev/null || true)" = "$project" ] &&
    [ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' \
      "$container" 2>/dev/null || true)" = "$service" ]
}

require_compose_container_ownership() {
  container="$1"
  project="$2"
  service="$3"
  docker container inspect "$container" >/dev/null 2>&1 || return 0
  container_is_compose_service "$container" "$project" "$service" || {
    actual_project=$(docker inspect \
      --format '{{index .Config.Labels "com.docker.compose.project"}}' \
      "$container" 2>/dev/null || true)
    actual_service=$(docker inspect \
      --format '{{index .Config.Labels "com.docker.compose.service"}}' \
      "$container" 2>/dev/null || true)
    echo "Container name is already owned by another deployment: $container" >&2
    echo "  Expected: Compose project $project, service $service" >&2
    echo "  Found: Compose project ${actual_project:-unlabelled}, service ${actual_service:-unlabelled}" >&2
    echo "CODEXSUN will not replace, stop, or reuse that container." >&2
    exit 78
  }
}

validate_container_ownership() {
  require_compose_container_ownership cxsun-mariadb cxsun-mariadb mariadb
  require_compose_container_ownership cxsun-redis cxsun-redis redis
  require_compose_container_ownership cxsun-media cxsun-media media
  require_compose_container_ownership cxsun-api cxsun-billing platform-api
  require_compose_container_ownership cxsun-web cxsun-billing platform-web
}

ensure_network() {
  network=$(env_value CXSUN_DOCKER_NETWORK)
  docker network inspect "$network" >/dev/null 2>&1 || docker network create "$network" >/dev/null
}

ensure_media_volumes() {
  for volume in "$(env_value MEDIA_DATA_VOLUME)" "$(env_value MEDIA_DB_VOLUME)"; do
    docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
  done
}

stack_compose() {
  stack="$1"
  shift
  docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/$stack/docker-compose.yml" "$@"
}

run_preflight() {
  prepare_deploy_env
  validate_deploy_env
  require_docker
  validate_container_ownership
  ensure_network
}
