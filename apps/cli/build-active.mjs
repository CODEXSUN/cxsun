#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')

function formatDuration(ms) {
  if (ms < 1_000) return `${Math.round(ms)}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

function run(label, command, args) {
  const startedAt = performance.now()
  console.log(`\n[build] ${label} started`)

  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  const duration = formatDuration(performance.now() - startedAt)

  if (result.status !== 0) {
    console.error(`[build] ${label} failed after ${duration}`)
    process.exit(result.status ?? 1)
  }

  console.log(`[build] ${label} completed in ${duration}`)
}

function runNpm(label, args) {
  if (process.platform === 'win32') {
    run(label, 'cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')])
    return
  }

  run(label, 'npm', args)
}

const totalStartedAt = performance.now()

runNpm('Backend server build', ['-w', 'apps/server', 'run', 'build'])
runNpm('Platform package build', ['-w', '@cxsun/platform', 'run', 'build'])
runNpm('Platform API build', ['-w', 'apps/platform-api', 'run', 'build'])
runNpm('Billing API build', ['-w', 'apps/billing-api', 'run', 'build'])
runNpm('Sites API build', ['-w', 'apps/sites-api', 'run', 'build'])
runNpm('CRM API build', ['-w', 'apps/crm-api', 'run', 'build'])
runNpm('Tally API build', ['-w', 'apps/tally-api', 'run', 'build'])
runNpm('Frappe API build', ['-w', 'apps/frappe-api', 'run', 'build'])
runNpm('Task Manager API build', ['-w', 'apps/task-manager-api', 'run', 'build'])
runNpm('Auditor API build', ['-w', 'apps/auditor-api', 'run', 'build'])
runNpm('Blog API build', ['-w', 'apps/blog-api', 'run', 'build'])
runNpm('Agent OS API build', ['-w', 'apps/agent-os-api', 'run', 'build'])
runNpm('Frontend app build', ['-w', 'apps/frontend', 'run', 'build'])
runNpm('CXSync Cloud build', ['-w', 'apps/cxsync-cloud', 'run', 'build'])
runNpm('CXSync web build', ['-w', 'apps/cxsync', 'run', 'build:web'])
runNpm('CXSync Electron compile', ['-w', 'apps/cxsync', 'run', 'compile:electron'])

console.log(`\n[build] Active build completed in ${formatDuration(performance.now() - totalStartedAt)}`)
