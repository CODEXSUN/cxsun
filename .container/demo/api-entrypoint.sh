#!/bin/sh
set -eu

cli_dir=/opt/cxsun-codex-cli
cli_path="$cli_dir/node_modules/.bin/codex"

if [ ! -x "$cli_path" ]; then
  npm install --prefix "$cli_dir" --no-save --no-package-lock --no-audit --no-fund @openai/codex@latest
fi

"$cli_path" --version
exec "$@"
