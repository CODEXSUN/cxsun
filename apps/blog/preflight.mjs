#!/usr/bin/env node
process.argv[2] = 'blog'
await import('../cli/preflight.mjs')
