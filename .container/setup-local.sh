#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
MARIADB_COMPOSE_FILE="$SCRIPT_DIR/database/mariadb.yml"
REDIS_COMPOSE_FILE="$SCRIPT_DIR/database/redis.yml"
MEDIA_SETUP_FILE="$SCRIPT_DIR/setup-media.sh"
export GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-http-header-size=65536}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:${PORT:-6005}}"
export VITE_STORAGE_BASE_URL="${VITE_STORAGE_BASE_URL:-$VITE_API_BASE_URL}"
export CXMEDIA_PORT="${CXMEDIA_PORT:-6050}"
export CXMEDIA_ADMIN_PASSWORD="${CXMEDIA_ADMIN_PASSWORD:-Sundarcomputers@123}"
export VITE_MEDIA_MANAGER_URL="${VITE_MEDIA_MANAGER_URL:-http://localhost:${CXMEDIA_PORT}}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:${VITE_PORT:-6010}}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:${VITE_PORT:-6010},https://localhost:${VITE_PORT:-6010}}"
export DB_HOST="${DB_HOST:-mariadb}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-cxsun_master}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export REDIS_DB="${REDIS_DB:-0}"
export REDIS_TLS="${REDIS_TLS:-false}"
export SKIP_MARIADB_WAIT="${SKIP_MARIADB_WAIT:-false}"
export HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-900}"

echo "Using compose file: $COMPOSE_FILE"
echo "Repository: $GIT_REPO_URL"
echo "Branch: ${GIT_BRANCH:-main}"
echo "Backend port: ${PORT:-6005}"
echo "Frontend port: ${VITE_PORT:-6010}"
echo "CXMedia port: ${CXMEDIA_PORT}"
echo "MariaDB: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo "Health wait limit: ${HEALTH_WAIT_SECONDS}s"

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

echo "Stopping existing CXSun container"
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
docker stop cxsun >/dev/null 2>&1 || true

echo "Removing existing CXSun container"
docker rm cxsun >/dev/null 2>&1 || true

echo "Removing CXSun workspace volumes"
docker volume rm cxsun-volume >/dev/null 2>&1 || true
docker volume rm cxsun_cxsun-workspace >/dev/null 2>&1 || true

echo "Starting MariaDB"
docker compose -f "$MARIADB_COMPOSE_FILE" up -d
docker network connect codexion-network mariadb >/dev/null 2>&1 || true

echo "Waiting for MariaDB at mariadb:3306"
for attempt in $(seq 1 120); do
  if docker exec mariadb mariadb-admin ping \
    --host=127.0.0.1 \
    --port=3306 \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --silent >/dev/null 2>&1; then
    echo "MariaDB is reachable"
    break
  fi

  if [ "$attempt" -eq 120 ]; then
    echo "MariaDB was not reachable after waiting." >&2
    docker logs --tail=80 mariadb || true
    exit 1
  fi

  sleep 1
done

echo "Starting Redis"
docker compose -f "$REDIS_COMPOSE_FILE" up -d

echo "Waiting for Redis at redis:6379"
for attempt in $(seq 1 60); do
  if [ -n "$REDIS_PASSWORD" ]; then
    if docker exec redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
      echo "Redis is reachable"
      break
    fi
  else
    if docker exec redis redis-cli ping 2>/dev/null | grep -q PONG; then
      echo "Redis is reachable"
      break
    fi
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "Redis was not reachable after waiting." >&2
    docker logs --tail=80 redis || true
    exit 1
  fi

  sleep 1
done

echo "Building Docker image cxsun:v1"
docker compose -f "$COMPOSE_FILE" build

echo "Checking CXMedia"
if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "CXMedia already running: cxmedia"
elif docker ps -a --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "Starting existing CXMedia container: cxmedia"
  docker start cxmedia >/dev/null
  docker network connect codexion-network cxmedia >/dev/null 2>&1 || true
else
  echo "CXMedia is not installed. Running media setup once."
  bash "$MEDIA_SETUP_FILE"
fi

echo "Starting CXSun"
docker compose -f "$COMPOSE_FILE" up -d

echo "Current status"
docker compose -f "$COMPOSE_FILE" ps

echo "Recent logs"
docker compose -f "$COMPOSE_FILE" logs --tail=80 cxsun

echo "Deploy complete."
echo "Backend: ${VITE_API_BASE_URL}"
echo "Frontend: ${FRONTEND_URL}"
echo "CXMedia: ${VITE_MEDIA_MANAGER_URL}"
