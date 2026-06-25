#!/usr/bin/env node
process.argv[2] = 'platform-api'
await import('../cli/preflight.mjs')
