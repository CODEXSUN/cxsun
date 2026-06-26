#!/usr/bin/env node
process.argv[2] = 'task-manager-api'
await import('../cli/preflight.mjs')
