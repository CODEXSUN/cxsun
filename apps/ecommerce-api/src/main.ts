import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveEcommerceApiPort, startEcommerceApi } from './runtime.js'

const port = resolveEcommerceApiPort()

try {
  const runtime = await startEcommerceApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Ecommerce API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
