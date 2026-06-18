#!/usr/bin/env node
process.argv[2] = 'docs'
await import('../cli/preflight.mjs')
