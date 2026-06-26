import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveTallyApiPort, startTallyApi } from './runtime.js'

const port = resolveTallyApiPort()

try {
  const runtime = await startTallyApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Tally API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
