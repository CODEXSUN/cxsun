#!/usr/bin/env node
process.argv[2] = 'textile-lab'
await import('../cli/preflight.mjs')
