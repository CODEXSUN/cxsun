#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="${BILLING_ENV_FILE:-$SCRIPT_DIR/.env}"
ACTION="${1:-up}"

DOCKER_BIN="${DOCKER_BIN:-docker}"

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  if grep -qi microsoft /proc/version 2>/dev/null && [ -x "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
    DOCKER_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
  fi
fi

docker_path() {
  if [[ "$DOCKER_BIN" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "$1"
  else
    printf '%s\n' "$1"
  fi
}

usage() {
  cat <<'EOF'
Usage: bash .container/billing/setup.sh [up|build|pull|status|logs|down]

The Billing stack deploys only:
  - Platform API
  - Billing API
  - Billing frontend

MariaDB, Redis, the Docker network, and the storage volume are external.
EOF
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing Billing deployment env file: $ENV_FILE" >&2
  echo "Copy .container/billing/.env.sample to .container/billing/.env and set real secrets." >&2
  exit 1
fi

compose() {
  "$DOCKER_BIN" compose --env-file "$(docker_path "$ENV_FILE")" -f "$(docker_path "$COMPOSE_FILE")" "$@"
}

network_name="$(grep '^CXSUN_DOCKER_NETWORK=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
storage_volume="$(grep '^BILLING_STORAGE_VOLUME=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
network_name="${network_name:-codexion-network}"
storage_volume="${storage_volume:-cxmedia-storage}"

ensure_external_resources() {
  "$DOCKER_BIN" network inspect "$network_name" >/dev/null 2>&1 || "$DOCKER_BIN" network create "$network_name" >/dev/null
  "$DOCKER_BIN" volume inspect "$storage_volume" >/dev/null 2>&1 || "$DOCKER_BIN" volume create "$storage_volume" >/dev/null
}

case "$ACTION" in
  up|deploy)
    ensure_external_resources
    compose up -d --build
    compose ps
    ;;
  build)
    compose build
    ;;
  pull)
    compose pull
    ;;
  status|ps)
    compose ps
    ;;
  logs)
    compose logs -f --tail=150
    ;;
  down|stop)
    compose down
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
