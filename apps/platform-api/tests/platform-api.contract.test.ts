import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '../src/infrastructure/database/connection.js'
import { startPlatformApi } from '../src/runtime.js'

const port = Number(process.env.PLATFORM_API_CONTRACT_PORT ?? 6196)

const runtime = await startPlatformApi({ port })
let failure: unknown

try {
  await expectJson({
    path: '/health',
    status: 200,
    assert: (body) => {
      if (body.status !== 'ok') {
        throw new Error(`Expected health status ok, received ${JSON.stringify(body)}`)
      }
    },
  })

  await expectJson({
    path: '/ready',
    status: 200,
    assert: (body) => {
      if (body.status !== 'ok' || (body.checks as Record<string, unknown> | undefined)?.database !== 'ok') {
        throw new Error(`Expected ready status ok with database check, received ${JSON.stringify(body)}`)
      }
    },
  })

  await expectRequestId('/health')

  await expectJson({
    path: '/api/v1/auth/session',
    status: 200,
    assert: (body) => {
      if (body.ok !== false || body.error !== 'Session token is required.') {
        throw new Error(`Expected missing-session response, received ${JSON.stringify(body)}`)
      }
    },
  })

  await expectJson({
    path: '/api/v1/tenants/context',
    status: 200,
    assert: (body) => {
      if (body.ok !== false) {
        throw new Error(`Expected missing tenant context response, received ${JSON.stringify(body)}`)
      }
    },
  })

  for (const path of [
    '/api/v1/industries',
    '/api/v1/tenant-domains',
    '/api/v1/tenants',
    '/api/v1/users/tenant-summary',
    '/api/v1/admin-users',
  ]) {
    await expectStatus({ path, status: 403 })
  }

  await expectAuthRateLimit()

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) {
    throw new Error('Expected a real MariaDB database connection, received no DATABASE() result.')
  }

  console.log(`Platform API contract ok: native routes + MariaDB ${databaseName}`)
} catch (error) {
  failure = error
} finally {
  await runtime.app.app.close()
  await closeDatabase()
}

if (failure) {
  console.error(failure)
  process.exitCode = 1
}

async function expectStatus({ path, status }: { path: string; status: number }) {
  const response = await fetch(`${runtime.url}${path}`)
  if (response.status !== status) {
    const body = await response.text()
    throw new Error(`Expected ${path} to return ${status}, received ${response.status}: ${body}`)
  }
}

async function expectRequestId(path: string) {
  const response = await fetch(`${runtime.url}${path}`)
  const requestId = response.headers.get('x-request-id')
  if (!requestId) {
    throw new Error(`Expected ${path} to include x-request-id response header.`)
  }
}

async function expectAuthRateLimit() {
  const email = `rate-limit-${Date.now()}@example.test`
  let limited = false

  for (let attempt = 0; attempt < 13; attempt += 1) {
    const response = await fetch(`${runtime.url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong-password' }),
    })
    if (response.status === 429) {
      limited = true
      break
    }
  }

  if (!limited) {
    throw new Error('Expected repeated auth login attempts to be rate limited with 429.')
  }
}

async function expectJson({
  path,
  status,
  assert,
}: {
  path: string
  status: number
  assert: (body: Record<string, unknown>) => void
}) {
  const response = await fetch(`${runtime.url}${path}`)
  if (response.status !== status) {
    const body = await response.text()
    throw new Error(`Expected ${path} to return ${status}, received ${response.status}: ${body}`)
  }

  const body = await response.json() as Record<string, unknown>
  assert(body)
}
