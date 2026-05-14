#!/bin/bash
# Run this after making changes to verify the currently active workspaces.
# Usage: bash assist/scripts/check.sh

set -eu

run_step() {
  local label="$1"
  shift

  echo ""
  echo "=== ${label} ==="
  "$@"
}

echo "Checking cxsun workspaces"

run_step "Active typechecks" npm run typecheck:active
run_step "Active builds" npm run build:active
