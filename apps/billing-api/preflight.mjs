#!/usr/bin/env node
process.argv[2] = 'billing-api'
await import('../cli/preflight.mjs')
