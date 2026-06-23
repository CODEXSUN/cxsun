import 'reflect-metadata'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CxApp } from '../../server/src/core/bootstrap.js'
import { getDatabase, initializeDatabase } from '../../server/src/infrastructure/database/connection.js'
import { sql } from 'kysely'
import { CxSyncCloudModule } from './cxsync-cloud.module.js'

await loadCxSyncCloudEnvironment()
const port = numberFromEnv('CXSYNC_CLOUD_PORT', 6077)
const host = process.env.CXSYNC_CLOUD_HOST?.trim() || process.env.HOST?.trim() || '0.0.0.0'
const bootstrapServiceKey = requiredServiceKey()
const cloudAdminSessions = new Map<string, number>()

await initializeDatabase()
const serviceKeyState = { hash: await loadPersistedServiceKeyHash() ?? hashServiceKey(bootstrapServiceKey) }

const app = await CxApp.create(CxSyncCloudModule, {
  host,
  logLevel: process.env.CXSYNC_CLOUD_LOG_LEVEL?.trim() || process.env.LOG_LEVEL?.trim() || 'info',
  port,
})
registerCxSyncServiceKeyGuard(app, serviceKeyState, cloudAdminSessions)
registerCloudAdminRoutes(app, serviceKeyState, cloudAdminSessions)

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

function registerCxSyncServiceKeyGuard(app: Awaited<ReturnType<typeof CxApp.create>>, serviceKey: { hash: string }, sessions: Map<string, number>) {
  app.app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0] ?? ''
    if (request.method === 'OPTIONS') return
    if (path === '/api/v1/cxsync-cloud/admin/login') return
    const guarded = path.startsWith('/api/v1/auth')
      || path.startsWith('/api/v1/cxsync')
      || path.startsWith('/api/v1/cxsync-cloud')
    if (!guarded) return

    const received = request.headers['x-cxsync-service-key']
    const value = Array.isArray(received) ? received[0] : received
    if (!matchesServiceKey(value, serviceKey.hash) && !hasCloudAdminSession(request.headers.cookie, sessions)) {
      return reply.status(401).send({ error: 'CXSync service key is required.', statusCode: 401 })
    }
  })
}

function registerCloudAdminRoutes(
  app: Awaited<ReturnType<typeof CxApp.create>>,
  serviceKey: { hash: string },
  sessions: Map<string, number>,
) {
  app.app.post('/api/v1/cxsync-cloud/admin/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string } | null
    const expectedEmail = process.env.SUPER_ADMIN_EMAIL?.trim() || ''
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD || ''
    if (!secureEqual(body?.email?.trim().toLowerCase(), expectedEmail.toLowerCase()) || !secureEqual(body?.password, expectedPassword)) {
      return reply.status(401).send({ error: 'Invalid login details.', statusCode: 401 })
    }
    const token = randomUUID().replaceAll('-', '') + randomBytes(16).toString('hex')
    sessions.set(token, Date.now() + 8 * 60 * 60 * 1000)
    reply.header('Set-Cookie', cloudAdminCookie(token))
    return { email: expectedEmail, name: 'CXSync Admin', role: 'super-admin' }
  })
  app.app.get('/api/v1/cxsync-cloud/admin/session', async (request, reply) => {
    if (!hasCloudAdminSession(request.headers.cookie, sessions)) return reply.status(401).send({ error: 'Cloud admin session is required.', statusCode: 401 })
    return { email: process.env.SUPER_ADMIN_EMAIL?.trim() || '', name: 'CXSync Admin', role: 'super-admin' }
  })
  app.app.post('/api/v1/cxsync-cloud/admin/logout', async (request, reply) => {
    const token = cookieValue(request.headers.cookie, 'cxsync_cloud_session')
    if (token) sessions.delete(token)
    reply.header('Set-Cookie', 'cxsync_cloud_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
    return { ok: true }
  })
  app.app.post('/api/v1/cxsync-cloud/service-key/generate', async (request, reply) => {
    if (!hasCloudAdminSession(request.headers.cookie, sessions)) return reply.status(401).send({ error: 'Cloud admin session is required.', statusCode: 401 })
    const key = randomBytes(32).toString('base64url')
    const keyHash = hashServiceKey(key)
    await savePersistedServiceKeyHash(keyHash)
    serviceKey.hash = keyHash
    return { key, keyPreview: `${key.slice(0, 6)}...${key.slice(-6)}`, updatedAt: new Date().toISOString() }
  })
}

function hasCloudAdminSession(cookie: string | undefined, sessions: Map<string, number>) {
  const token = cookieValue(cookie, 'cxsync_cloud_session')
  if (!token) return false
  const expiresAt = sessions.get(token) ?? 0
  if (expiresAt <= Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

function cookieValue(header: string | undefined, name: string) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}

function cloudAdminCookie(token: string) {
  const secure = process.env.CXSYNC_CLOUD_PUBLIC_URL?.trim().startsWith('https://') ? '; Secure' : ''
  return `cxsync_cloud_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`
}

function secureEqual(received: string | undefined, expected: string) {
  if (!received || !expected) return false
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

function matchesServiceKey(received: string | undefined, expectedHash: string) {
  if (!received) return false
  const left = Buffer.from(hashServiceKey(received))
  const right = Buffer.from(expectedHash)
  return left.length === right.length && timingSafeEqual(left, right)
}

function requiredServiceKey() {
  const value = process.env.CXSYNC_SERVICE_KEY?.trim()
  if (!value) throw new Error('CXSYNC_SERVICE_KEY is required. CXSync Cloud refuses to start without its private service key.')
  if (!/^[A-Za-z0-9_-]{32,160}$/.test(value)) throw new Error('CXSYNC_SERVICE_KEY must be 32-160 URL-safe characters.')
  return value
}

async function loadCxSyncCloudEnvironment() {
  const sourceDirectory = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(sourceDirectory, '../../../.env'),
    resolve(sourceDirectory, '../../../../../.env'),
  ]
  for (const path of candidates) {
    try {
      const text = await readFile(path, 'utf8')
      for (const line of text.split(/\r?\n/)) {
        const normalized = line.trim()
        if (!normalized || normalized.startsWith('#')) continue
        const separator = normalized.indexOf('=')
        if (separator <= 0) continue
        const key = normalized.slice(0, separator).trim()
        if (process.env[key] !== undefined) continue
        process.env[key] = normalized.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      }
      return
    } catch {
      // Try the next development or packaged location.
    }
  }
}

async function loadPersistedServiceKeyHash() {
  await ensureCloudConfigTable()
  const result = await sql<{ config_value: string }>`SELECT config_value FROM cxsync_cloud_config WHERE config_key = 'service_key' LIMIT 1`.execute(getDatabase())
  const value = result.rows[0]?.config_value?.trim()
  if (!value) return null
  if (/^[a-f0-9]{64}$/i.test(value)) return value.toLowerCase()
  if (/^[A-Za-z0-9_-]{32,160}$/.test(value)) {
    const migrated = hashServiceKey(value)
    await savePersistedServiceKeyHash(migrated)
    return migrated
  }
  return null
}

async function savePersistedServiceKeyHash(value: string) {
  await ensureCloudConfigTable()
  await sql`
    INSERT INTO cxsync_cloud_config (config_key, config_value, updated_at)
    VALUES ('service_key', ${value}, UTC_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = VALUES(updated_at)
  `.execute(getDatabase())
}

function hashServiceKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function ensureCloudConfigTable() {
  await getDatabase().schema
    .createTable('cxsync_cloud_config')
    .ifNotExists()
    .addColumn('config_key', 'varchar(120)', (column) => column.primaryKey())
    .addColumn('config_value', 'text', (column) => column.notNull())
    .addColumn('updated_at', 'datetime', (column) => column.notNull())
    .execute()
}
