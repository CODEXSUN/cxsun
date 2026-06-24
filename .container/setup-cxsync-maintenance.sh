#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$REPOSITORY_ROOT/.env"
REINSTALL=false
STOP_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --reinstall) REINSTALL=true ;;
    --stop) STOP_ONLY=true ;;
    -h|--help)
      echo "Usage: .container/setup-cxsync-maintenance.sh [--reinstall|--stop]"
      echo "  --reinstall  Recreate only the isolated CXSync maintenance workspace."
      echo "  --stop       Stop and remove only the isolated CXSync maintenance container."
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

read_env_value() {
  key="$1"
  if [ ! -f "$ENV_FILE" ]; then return 0; fi
  grep "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//" || true
}

load_if_empty() {
  key="$1"
  current="${!key:-}"
  if [ -z "$current" ]; then
    printf -v "$key" '%s' "$(read_env_value "$key")"
    export "$key"
  fi
}

for key in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD SUPER_ADMIN_NAME SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD CXSYNC_SERVICE_KEY CXSYNC_CLOUD_PUBLIC_URL; do
  load_if_empty "$key"
done

export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
export GIT_BRANCH="${GIT_BRANCH:-main}"
export GIT_PULL_ON_START="${GIT_PULL_ON_START:-true}"
export CXSYNC_EXPECTED_VERSION="${CXSYNC_EXPECTED_VERSION:-1.0.128}"
export CXSYNC_MAINTENANCE_WEB_HOST_PORT="${CXSYNC_MAINTENANCE_WEB_HOST_PORT:-6080}"
export CXSYNC_MAINTENANCE_API_HOST_PORT="${CXSYNC_MAINTENANCE_API_HOST_PORT:-6078}"
export CXSYNC_FLEET_CLONE_ENABLED="${CXSYNC_FLEET_CLONE_ENABLED:-false}"
export CXSYNC_FLEET_SOURCE_QUIESCED="${CXSYNC_FLEET_SOURCE_QUIESCED:-false}"
export CXSYNC_FLEET_DUMP_PATH="${CXSYNC_FLEET_DUMP_PATH:-mariadb-dump}"
export CXSYNC_FLEET_CLIENT_PATH="${CXSYNC_FLEET_CLIENT_PATH:-mariadb}"
export DB_HOST="${DB_HOST:-mariadb}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-cxsun_master}"
export DB_USER="${DB_USER:-root}"
export CXSYNC_CLOUD_PUBLIC_URL="${CXSYNC_CLOUD_PUBLIC_URL:-https://cxsync.codexsun.com}"

if [ "$STOP_ONLY" = "true" ]; then
  docker compose -f "$COMPOSE_FILE" stop cxsync-maintenance >/dev/null 2>&1 || true
  docker compose -f "$COMPOSE_FILE" rm -f cxsync-maintenance >/dev/null 2>&1 || true
  echo "Isolated CXSync maintenance service stopped. Live CXSun was not touched."
  exit 0
fi

require_value() {
  key="$1"
  if [ -z "${!key:-}" ]; then
    echo "$key is required for isolated CXSync maintenance deployment." >&2
    exit 1
  fi
}

require_value DB_PASSWORD
require_value SUPER_ADMIN_EMAIL
require_value SUPER_ADMIN_PASSWORD
require_value CXSYNC_SERVICE_KEY

if ! [[ "$CXSYNC_SERVICE_KEY" =~ ^[A-Za-z0-9_-]{32,160}$ ]]; then
  echo "CXSYNC_SERVICE_KEY must be 32-160 URL-safe characters." >&2
  exit 1
fi

if [ "$CXSYNC_FLEET_CLONE_ENABLED" = "true" ] || [ "$CXSYNC_FLEET_SOURCE_QUIESCED" = "true" ]; then
  echo "Initial isolated deployment must keep fleet cloning and source-quiesced flags false." >&2
  echo "Enable them together only during the separately approved canary rehearsal window." >&2
  exit 1
fi

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Required Docker network codexion-network does not exist." >&2
  exit 1
fi

LIVE_WAS_RUNNING=false
if docker ps --format '{{.Names}}' | grep -Fx cxsun >/dev/null 2>&1; then
  LIVE_WAS_RUNNING=true
fi

if docker ps -a --format '{{.Names}}' | grep -Fx "$DB_HOST" >/dev/null 2>&1; then
  docker network connect codexion-network "$DB_HOST" >/dev/null 2>&1 || true
fi

docker compose -f "$COMPOSE_FILE" stop cxsync-maintenance >/dev/null 2>&1 || true
docker compose -f "$COMPOSE_FILE" rm -f cxsync-maintenance >/dev/null 2>&1 || true

if [ "$REINSTALL" = "true" ]; then
  echo "Removing only the isolated CXSync maintenance workspace volume."
  docker volume rm cxsync-maintenance-workspace >/dev/null 2>&1 || true
fi

echo "Building isolated CXSync maintenance image."
docker compose -f "$COMPOSE_FILE" build cxsync-maintenance

echo "Starting isolated CXSync maintenance service."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps cxsync-maintenance

echo "Waiting for isolated CXSync Cloud health on host port $CXSYNC_MAINTENANCE_API_HOST_PORT."
for attempt in $(seq 1 180); do
  if curl -fsS "http://127.0.0.1:${CXSYNC_MAINTENANCE_API_HOST_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 180 ]; then
    docker compose -f "$COMPOSE_FILE" logs --tail=160 cxsync-maintenance || true
    echo "Isolated CXSync maintenance health failed." >&2
    exit 1
  fi
  sleep 2
done

RUNNING_VERSION="$(docker compose -f "$COMPOSE_FILE" exec -T cxsync-maintenance node -p "require('/workspace/cxsun/package.json').version")"
if [ "$RUNNING_VERSION" != "$CXSYNC_EXPECTED_VERSION" ]; then
  echo "Version verification failed: expected $CXSYNC_EXPECTED_VERSION, running $RUNNING_VERSION." >&2
  exit 1
fi

if [ "$LIVE_WAS_RUNNING" = "true" ] && ! docker ps --format '{{.Names}}' | grep -Fx cxsun >/dev/null 2>&1; then
  echo "Safety failure: the live CXSun container was running before maintenance deployment but is not running now." >&2
  exit 1
fi

echo "Isolated CXSync maintenance deployment ready."
echo "Version: $RUNNING_VERSION"
echo "Web console: http://127.0.0.1:${CXSYNC_MAINTENANCE_WEB_HOST_PORT}"
echo "Maintenance API: http://127.0.0.1:${CXSYNC_MAINTENANCE_API_HOST_PORT}"
echo "Fleet clone execution: locked"
echo "Live CXSun container touched: no"
