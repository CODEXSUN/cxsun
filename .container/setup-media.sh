#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

export CXMEDIA_STORAGE_VOLUME="${CXMEDIA_STORAGE_VOLUME:-cxmedia-storage}"
export CXMEDIA_DB_VOLUME="${CXMEDIA_DB_VOLUME:-cxmedia-db}"
export CXMEDIA_PORT="${CXMEDIA_PORT:-6050}"
export CXMEDIA_ADMIN_PASSWORD="${CXMEDIA_ADMIN_PASSWORD:-Admin@12345}"

if ! docker network inspect codexion-network >/dev/null 2>&1; then
  echo "Creating Docker network codexion-network"
  docker network create codexion-network
fi

echo "Ensuring CXMedia volumes"
docker volume create "$CXMEDIA_STORAGE_VOLUME" >/dev/null
docker volume create "$CXMEDIA_DB_VOLUME" >/dev/null

echo "Removing old temporary media containers when present"
docker rm -f cxsun-storage-cdn >/dev/null 2>&1 || true
docker rm -f cxsun-storage-browser >/dev/null 2>&1 || true

if docker ps --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "CXMedia already running: cxmedia"
  docker network connect codexion-network cxmedia >/dev/null 2>&1 || true
elif docker ps -a --format '{{.Names}}' | grep -Fx cxmedia >/dev/null 2>&1; then
  echo "Starting existing CXMedia container: cxmedia"
  docker start cxmedia >/dev/null
  docker network connect codexion-network cxmedia >/dev/null 2>&1 || true
else
  echo "Installing CXMedia container: cxmedia"
  docker compose -f "$COMPOSE_FILE" up -d --no-deps cxmedia
fi

echo "Ensuring CXMedia admin password"
docker exec cxmedia filebrowser users update admin --password "$CXMEDIA_ADMIN_PASSWORD" --database /database/filebrowser.db >/dev/null 2>&1 || true

echo "CXMedia ready."
echo "URL: http://localhost:${CXMEDIA_PORT}"
echo "Login: admin / $CXMEDIA_ADMIN_PASSWORD"
