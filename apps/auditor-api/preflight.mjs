#!/usr/bin/env node
process.argv[2] = 'auditor-api'
await import('../cli/preflight.mjs')
