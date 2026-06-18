#!/usr/bin/env node
process.argv[2] = 'garment'
await import('../cli/preflight.mjs')
