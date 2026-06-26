#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${BILLING_ENV_FILE:-$SCRIPT_DIR/.env.local}"
ENV_SAMPLE="$SCRIPT_DIR/.env.local.sample"
BILLING_SETUP="$SCRIPT_DIR/setup.sh"
MARIADB_COMPOSE_FILE="$CONTAINER_DIR/database/mariadb.yml"
REDIS_COMPOSE_FILE="$CONTAINER_DIR/database/redis.yml"
MEDIA_SETUP_FILE="$CONTAINER_DIR/setup-media.sh"
ACTION="${1:-up}"
DOCKER_BIN="${DOCKER_BIN:-docker}"

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  if grep -qi microsoft /proc/version 2>/dev/null && [ -x "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
    DOCKER_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
    export DOCKER_BIN
  fi
fi

docker_path() {
  if [[ "$DOCKER_BIN" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "$1"
  else
    printf '%s\n' "$1"
  fi
}

docker_cmd() {
  if [[ "$DOCKER_BIN" == *.exe ]] || [[ "$(command -v "$DOCKER_BIN" 2>/dev/null || true)" == *.exe ]]; then
    MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' "$DOCKER_BIN" "$@"
  else
    "$DOCKER_BIN" "$@"
  fi
}

usage() {
  cat <<'EOF'
Usage: bash .container/billing/billing-stack.sh [up|build|status|logs|down|restart|infra|verify]

Local Billing stack:
  - MariaDB
  - Redis
  - CXMedia when available
  - Platform API
  - Billing API
  - Billing frontend

Use BILLING_ENV_FILE to point at another local env file.
EOF
}

compose_billing() {
  COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}" BILLING_ENV_FILE="$ENV_FILE" DOCKER_BIN="$DOCKER_BIN" bash "$BILLING_SETUP" "$@"
}

ensure_env_file() {
  if [ -f "$ENV_FILE" ]; then
    return
  fi

  if [ ! -f "$ENV_SAMPLE" ]; then
    echo "Missing local Billing env sample: $ENV_SAMPLE" >&2
    exit 1
  fi

  echo "Creating local Billing env file: $ENV_FILE"
  cp "$ENV_SAMPLE" "$ENV_FILE"
}

ensure_docker() {
  if ! docker_cmd info >/dev/null 2>&1; then
    echo "Docker is not reachable. Start Docker Desktop and rerun this script." >&2
    exit 1
  fi
}

ensure_network() {
  if ! docker_cmd network inspect codexion-network >/dev/null 2>&1; then
    echo "Creating Docker network codexion-network"
    docker_cmd network create codexion-network >/dev/null
  fi
}

start_mariadb() {
  echo "Starting MariaDB"
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fx mariadb >/dev/null 2>&1; then
    docker_cmd start mariadb >/dev/null
  else
    docker_cmd compose --project-name cxsun-local-mariadb -f "$(docker_path "$MARIADB_COMPOSE_FILE")" up -d
  fi
  docker_cmd network connect codexion-network mariadb >/dev/null 2>&1 || true

  echo "Waiting for MariaDB"
  for attempt in $(seq 1 120); do
    if docker_cmd exec mariadb mariadb-admin ping \
      --host=127.0.0.1 \
      --port=3306 \
      --user="${DB_USER:-root}" \
      --password="${DB_PASSWORD:-DbPass1@@}" \
      --silent >/dev/null 2>&1; then
      echo "MariaDB is ready"
      return
    fi

    if [ "$attempt" -eq 120 ]; then
      echo "MariaDB was not reachable after waiting." >&2
      docker_cmd logs --tail=80 mariadb || true
      exit 1
    fi

    sleep 1
  done
}

ensure_database() {
  local database_name="${DB_NAME:-cxsun_master}"

  echo "Ensuring MariaDB database: $database_name"
  docker_cmd exec mariadb mariadb \
    --host=127.0.0.1 \
    --port=3306 \
    --user="${DB_USER:-root}" \
    --password="${DB_PASSWORD:-DbPass1@@}" \
    --execute="CREATE DATABASE IF NOT EXISTS \`$database_name\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

start_redis() {
  echo "Starting Redis"
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fx redis >/dev/null 2>&1; then
    docker_cmd start redis >/dev/null
  else
    docker_cmd compose --project-name cxsun-local-redis -f "$(docker_path "$REDIS_COMPOSE_FILE")" up -d
  fi

  echo "Waiting for Redis"
  for attempt in $(seq 1 60); do
    if [ -n "${REDIS_PASSWORD:-}" ]; then
      if docker_cmd exec redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
        echo "Redis is ready"
        return
      fi
    else
      if docker_cmd exec redis redis-cli ping 2>/dev/null | grep -q PONG; then
        echo "Redis is ready"
        return
      fi
    fi

    if [ "$attempt" -eq 60 ]; then
      echo "Redis was not reachable after waiting." >&2
      docker_cmd logs --tail=80 redis || true
      exit 1
    fi

    sleep 1
  done
}

start_media() {
  if [ "${BILLING_START_MEDIA:-false}" != "true" ]; then
    echo "Skipping CXMedia; set BILLING_START_MEDIA=true in $ENV_FILE to start it"
    return
  fi

  if [ ! -f "$MEDIA_SETUP_FILE" ]; then
    echo "Skipping CXMedia: $MEDIA_SETUP_FILE not found"
    return
  fi

  echo "Checking CXMedia"
  DOCKER_BIN="$DOCKER_BIN" bash "$MEDIA_SETUP_FILE"
}

run_database_setup() {
  if [ "${BILLING_DB_SETUP:-true}" != "true" ]; then
    echo "Skipping database setup; set BILLING_DB_SETUP=true in $ENV_FILE to enable it"
    return
  fi

  echo "Running database setup and tenant seed"
  docker_cmd run --rm \
    --network codexion-network \
    -v "$(docker_path "$REPO_ROOT"):/src:ro" \
    -v "${BILLING_DB_SETUP_NPM_CACHE_VOLUME:-cxsun-billing-db-setup-npm-cache}:/root/.npm" \
    -w /workspace \
    -e DB_HOST="${DB_HOST:-mariadb}" \
    -e DB_PORT="${DB_PORT:-3306}" \
    -e DB_NAME="${DB_NAME:-cxsun_master}" \
    -e DB_USER="${DB_USER:-root}" \
    -e DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}" \
    -e TENANT_DB_HOST="${TENANT_DB_HOST:-${DB_HOST:-mariadb}}" \
    -e TENANT_DB_PORT="${TENANT_DB_PORT:-${DB_PORT:-3306}}" \
    -e TENANT_DB_USER="${TENANT_DB_USER:-${DB_USER:-root}}" \
    -e TENANT_DB_SECRET_REF="${TENANT_DB_SECRET_REF:-DB_PASSWORD}" \
    -e SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-SUNDAR}" \
    -e SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-sundar@sundar.com}" \
    -e SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Kalarani1@@}" \
    -e SOFTWARE_ADMIN_NAME="${SOFTWARE_ADMIN_NAME:-Admin}" \
    -e SOFTWARE_ADMIN_EMAIL="${SOFTWARE_ADMIN_EMAIL:-admin@admin.com}" \
    -e SOFTWARE_ADMIN_PASSWORD="${SOFTWARE_ADMIN_PASSWORD:-Admin@123}" \
    -e TENANT_ADMIN_NAME="${TENANT_ADMIN_NAME:-ADMIN}" \
    -e TENANT_ADMIN_EMAIL="${TENANT_ADMIN_EMAIL:-admin@tenant.com}" \
    -e TENANT_ADMIN_PASSWORD="${TENANT_ADMIN_PASSWORD:-admin@123}" \
    -e TENANT_PROVISION_TIMEOUT_MS="${TENANT_PROVISION_TIMEOUT_MS:-120000}" \
    -e REDIS_HOST="${REDIS_HOST:-redis}" \
    -e REDIS_PORT="${REDIS_PORT:-6379}" \
    -e REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
    -e REDIS_DB="${REDIS_DB:-0}" \
    -e REDIS_TLS="${REDIS_TLS:-false}" \
    "${BILLING_DB_SETUP_IMAGE:-node:24-bookworm-slim}" \
    sh -lc "tar --exclude=.git --exclude=node_modules --exclude=build --exclude=dist --exclude=.container/billing/.env --exclude=.container/billing/.env.local -cf - -C /src . | tar -xf - -C /workspace && npm ci && npm run db:setup -- --target=all"
}

load_env() {
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

start_infra() {
  ensure_docker
  ensure_env_file
  load_env
  ensure_network
  start_mariadb
  ensure_database
  start_redis
  start_media
  run_database_setup
}

verify_http() {
  local name="$1"
  local url="$2"

  echo "Checking $name: $url"
  for attempt in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name is reachable"
      return
    fi

    if [ "$attempt" -eq 60 ]; then
      echo "$name did not become reachable: $url" >&2
      return 1
    fi

    sleep 2
  done
}

verify_stack() {
  verify_http "Platform API" "http://127.0.0.1:${PLATFORM_API_HOST_PORT:-6105}/health"
  verify_http "Billing API" "http://127.0.0.1:${BILLING_API_HOST_PORT:-6205}/health"
  verify_http "Billing frontend" "http://127.0.0.1:${BILLING_FRONTEND_HOST_PORT:-6010}/health"
}

case "$ACTION" in
  up|deploy)
    start_infra
    compose_billing up
    verify_stack
    ;;
  build)
    ensure_env_file
    compose_billing build
    ;;
  restart)
    start_infra
    compose_billing down
    compose_billing up
    verify_stack
    ;;
  infra)
    start_infra
    ;;
  verify)
    ensure_env_file
    load_env
    verify_stack
    ;;
  status|ps)
    ensure_env_file
    compose_billing status
    ;;
  logs)
    ensure_env_file
    compose_billing logs
    ;;
  down|stop)
    ensure_env_file
    compose_billing down
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    usage >&2
    exit 1
    ;;
esac
