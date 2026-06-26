import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveFrappeApiPort, startFrappeApi } from './runtime.js'

const port = resolveFrappeApiPort()

try {
  const runtime = await startFrappeApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Frappe API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
