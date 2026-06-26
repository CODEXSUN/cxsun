import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveAgentOsApiPort, startAgentOsApi } from './runtime.js'

const port = resolveAgentOsApiPort()

try {
  const runtime = await startAgentOsApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Agent OS API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
