import 'reflect-metadata'
import { CxApp } from '../../server/src/core/bootstrap.js'
import { initializeDatabase } from '../../server/src/infrastructure/database/connection.js'
import { CxSyncCloudModule } from './cxsync-cloud.module.js'

const port = numberFromEnv('CXSYNC_CLOUD_PORT', 6077)
const host = process.env.CXSYNC_CLOUD_HOST?.trim() || process.env.HOST?.trim() || '0.0.0.0'

await initializeDatabase()

const app = await CxApp.create(CxSyncCloudModule, {
  host,
  logLevel: process.env.CXSYNC_CLOUD_LOG_LEVEL?.trim() || process.env.LOG_LEVEL?.trim() || 'info',
  port,
})
registerCxSyncServiceKeyGuard(app)

try {
  await app.start()

  const healthUrl = `http://127.0.0.1:${port}/health`
  const res = await fetch(healthUrl)
  const body = await res.json()
  console.log(`  ok CXSync Cloud health check: ${JSON.stringify(body)}`)
  console.log(`  ok CXSync Cloud API: http://127.0.0.1:${port}/api/v1/cxsync/tenant-snapshot`)
} catch (err) {
  console.error(err)
  process.exit(1)
}

function numberFromEnv(key: string, fallback: number) {
  const parsed = Number(process.env[key])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function registerCxSyncServiceKeyGuard(app: Awaited<ReturnType<typeof CxApp.create>>) {
  const requiredKey = process.env.CXSYNC_SERVICE_KEY?.trim()
  if (!requiredKey) {
    console.warn('  ! CXSYNC_SERVICE_KEY is not set. CXSync Cloud private API key guard is disabled.')
    return
  }

  app.app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0] ?? ''
    if (request.method === 'GET' && (path === '/api/v1/cxsync-cloud/status' || path === '/api/v1/cxsync-cloud/handshake')) {
      return
    }
    const guarded = path.startsWith('/api/v1/auth')
      || path.startsWith('/api/v1/cxsync')
      || path.startsWith('/api/v1/cxsync-cloud')
    if (!guarded) return

    const received = request.headers['x-cxsync-service-key']
    const value = Array.isArray(received) ? received[0] : received
    if (value !== requiredKey) {
      return reply.status(401).send({ error: 'CXSync service key is required.', statusCode: 401 })
    }
  })
}
