#!/usr/bin/env node
process.argv[2] = 'tally-api'
await import('../cli/preflight.mjs')
