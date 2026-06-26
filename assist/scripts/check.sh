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

run_node_script() {
  local script="$1"

  if command -v node >/dev/null 2>&1; then
    node "$script"
    return
  fi

  if command -v cmd.exe >/dev/null 2>&1; then
    local windows_script
    windows_script="$(printf '%s' "$script" | sed 's#/#\\#g')"
    cmd.exe /d /s /c "node ${windows_script}"
    return
  fi

  echo "Node.js was not found in this shell. Run from npm or add node to PATH." >&2
  return 127
}

echo "Checking cxsun workspaces"

run_step "Documentation and changelog policy" run_node_script assist/scripts/check-doc-progress.mjs
run_step "Active typechecks" npm run typecheck:active
run_step "Active builds" npm run build:active
