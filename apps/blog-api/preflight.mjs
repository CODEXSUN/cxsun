#!/usr/bin/env node
process.argv[2] = 'blog-api'
await import('../cli/preflight.mjs')
