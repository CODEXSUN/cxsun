#!/usr/bin/env node
process.argv[2] = 'crm'
await import('../cli/preflight.mjs')
