#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."
docker compose --env-file .container/demo/deploy.env \
  -f .container/demo/docker-compose.yml \
  exec -T platform-api \
  npm install --prefix /opt/cxsun-codex-cli \
    --no-save --no-package-lock --no-audit --no-fund @openai/codex@latest
docker compose --env-file .container/demo/deploy.env \
  -f .container/demo/docker-compose.yml \
  exec -T platform-api codex --version
