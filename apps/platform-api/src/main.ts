import 'reflect-metadata'
import { waitForHealth } from './core/runtime/api-runtime.js'
import { resolvePlatformApiPort, startPlatformApi } from './runtime.js'

const port = resolvePlatformApiPort()

try {
  const runtime = await startPlatformApi({ port })

  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Platform API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
