import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveBillingApiPort, startBillingApi } from './runtime.js'

const port = resolveBillingApiPort()

try {
  const runtime = await startBillingApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Billing API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
