#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
REDIS_COMPOSE_FILE="$SCRIPT_DIR/database/redis.yml"
FRESH_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --fresh)
      FRESH_INSTALL=true
      ;;
    -h|--help)
      echo "Usage: bash .container/setup-cloud.sh [--fresh]"
      echo "  --fresh  Remove and recreate the CXSun app container/workspace volume. MariaDB is never touched."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: bash .container/setup-cloud.sh [--fresh]" >&2
      exit 1
      ;;
  esac
done

export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
export GIT_BRANCH="${GIT_BRANCH:-main}"
export GIT_PULL_ON_START="${GIT_PULL_ON_START:-false}"
export PORT="${PORT:-6005}"
export VITE_PORT="${VITE_PORT:-6010}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://codexsun.com}"
export FRONTEND_URL="${FRONTEND_URL:-https://codexsun.com}"
export CORS_ORIGINS="${CORS_ORIGINS:-https://codexsun.com,https://www.codexsun.com}"
export DB_HOST="${DB_HOST:-mariadb}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-cxsun_master}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"

echo "Using compose file: $COMPOSE_FILE"
echo "Repository: $GIT_REPO_URL"
echo "Branch: $GIT_BRANCH"
echo "Public URL: $FRONTEND_URL"
echo "API URL: $VITE_API_BASE_URL"
echo "Backend port: $PORT"
echo "Frontend port: $VITE_PORT"
echo "MariaDB: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo "Fresh reinstall: $FRESH_INSTALL"

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

echo "Starting Redis"
docker compose -f "$REDIS_COMPOSE_FILE" up -d

echo "Stopping existing CXSun container"
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
docker stop cxsun >/dev/null 2>&1 || true

echo "Removing existing CXSun container"
docker rm cxsun >/dev/null 2>&1 || true

if [ "$FRESH_INSTALL" = "true" ]; then
  echo "Fresh reinstall requested: removing CXSun workspace volumes only"
  docker volume rm cxsun-volume >/dev/null 2>&1 || true
  docker volume rm cxsun_cxsun-workspace >/dev/null 2>&1 || true
  echo "MariaDB is preserved and not touched by this script"
fi

echo "Building Docker image cxsun:v1"
docker compose -f "$COMPOSE_FILE" build

echo "Starting CXSun"
docker compose -f "$COMPOSE_FILE" up -d

echo "Current status"
docker compose -f "$COMPOSE_FILE" ps

echo "Recent logs"
docker compose -f "$COMPOSE_FILE" logs --tail=80 cxsun

echo "Cloud deploy complete."
echo "Backend: $VITE_API_BASE_URL"
echo "Frontend: $FRONTEND_URL"
