#!/usr/bin/env node

import { spawn } from 'child_process'

const port = Number(process.env.PLATFORM_API_SMOKE_PORT ?? 6195)
const timeoutMs = Number(process.env.PLATFORM_API_SMOKE_TIMEOUT_MS ?? 30_000)
const startedAt = Date.now()

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', 'src/main.ts'],
  {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PLATFORM_API_PORT: String(port),
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

let output = ''
child.stdout.on('data', (chunk) => {
  output += chunk.toString()
})
child.stderr.on('data', (chunk) => {
  output += chunk.toString()
})

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stop() {
  if (child.exitCode === null && !child.killed) {
    child.kill('SIGTERM')
    await wait(500)
    if (child.exitCode === null && !child.killed) child.kill('SIGKILL')
  }
}

try {
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Platform API exited early with code ${child.exitCode}\n${output}`)
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) {
        const body = await response.json()
        console.log(`Platform API smoke ok: ${JSON.stringify(body)}`)
        await stop()
        process.exit(0)
      }
    } catch {
      // Keep polling until the timeout; startup may still be initializing the database.
    }

    await wait(500)
  }

  throw new Error(`Platform API smoke timed out after ${timeoutMs}ms\n${output}`)
} catch (error) {
  await stop()
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
