#!/usr/bin/env node
process.argv[2] = 'agent-os-api'
await import('../cli/preflight.mjs')
