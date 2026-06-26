#!/usr/bin/env node
process.argv.splice(2, 0, 'frontend')
await import('../cli/preflight.mjs')
