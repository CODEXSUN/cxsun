import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveAuditorApiPort, startAuditorApi } from './runtime.js'

const port = resolveAuditorApiPort()

try {
  const runtime = await startAuditorApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Auditor API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
