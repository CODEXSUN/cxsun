#!/usr/bin/env node
process.argv[2] = 'frappe-api'
await import('../cli/preflight.mjs')
