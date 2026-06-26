import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveTaskManagerApiPort, startTaskManagerApi } from './runtime.js'

const port = resolveTaskManagerApiPort()

try {
  const runtime = await startTaskManagerApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Task Manager API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
