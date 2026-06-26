#!/usr/bin/env node
process.argv[2] = 'crm-api'
await import('../cli/preflight.mjs')
