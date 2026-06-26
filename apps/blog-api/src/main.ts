import 'reflect-metadata'
import { waitForHealth } from '@cxsun/platform/core/runtime/api-runtime.js'
import { resolveBlogApiPort, startBlogApi } from './runtime.js'

const port = resolveBlogApiPort()

try {
  const runtime = await startBlogApi({ port })
  const body = await waitForHealth(runtime.localHealthUrl)
  console.log(`  ok Blog API ready: ${body.status ?? 'unknown'} | v${body.version ?? 'unknown'} | ${runtime.publicUrl}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}
