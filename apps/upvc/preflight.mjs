#!/usr/bin/env node
process.argv[2] = 'upvc'
await import('../cli/preflight.mjs')
