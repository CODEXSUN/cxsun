#!/usr/bin/env node
process.argv[2] = 'welfare'
await import('../cli/preflight.mjs')
