#!/usr/bin/env node
process.argv[2] = 'sites'
await import('../cli/preflight.mjs')
