#!/usr/bin/env node
process.argv[2] = 'auditor'
await import('../cli/preflight.mjs')
