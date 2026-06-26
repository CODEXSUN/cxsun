import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveCrmApiPort, startCrmApi } from './runtime.js'

const port = resolveCrmApiPort()

try {
  const runtime = await startCrmApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok CRM API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
