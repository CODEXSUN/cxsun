#!/usr/bin/env node
process.argv[2] = 'sites-api'
await import('../cli/preflight.mjs')
