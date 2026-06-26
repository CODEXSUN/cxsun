import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveSitesApiPort, startSitesApi } from './runtime.js'

const port = resolveSitesApiPort()

try {
  const runtime = await startSitesApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Sites API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
