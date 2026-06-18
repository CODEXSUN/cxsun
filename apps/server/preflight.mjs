#!/usr/bin/env node
process.argv[2] = 'server'
await import('../cli/preflight.mjs')
