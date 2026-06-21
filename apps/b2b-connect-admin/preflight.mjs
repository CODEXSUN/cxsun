#!/usr/bin/env node
process.argv[2] = 'b2b-connect-admin'
await import('../cli/preflight.mjs')
