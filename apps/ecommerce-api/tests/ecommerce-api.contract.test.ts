import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { startEcommerceApi } from '../src/runtime.js'

const port = Number(process.env.ECOMMERCE_API_CONTRACT_PORT ?? 6396)
const runtime = await startEcommerceApi({ port })
let failure: unknown

try {
  await expectJson('/health', 200, (body) => {
    if (body.status !== 'ok') throw new Error(`Expected health ok, received ${JSON.stringify(body)}`)
  })

  for (const path of [
    '/api/v1/ecommerce',
    '/api/v1/ecommerce/dashboard',
    '/api/v1/contacts',
    '/api/v1/products',
  ]) {
    await expectProtected(path)
  }

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) throw new Error('Expected a real MariaDB database connection.')

  console.log(`Ecommerce API contract ok: mounted ecommerce route family + MariaDB ${databaseName}`)
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

async function expectProtected(path: string) {
  const response = await fetch(`${runtime.url}${path}`)
  if (![401, 403].includes(response.status)) {
    throw new Error(`Expected ${path} to be protected, received ${response.status}: ${await response.text()}`)
  }
}

async function expectJson(path: string, status: number, assert: (body: Record<string, unknown>) => void) {
  const response = await fetch(`${runtime.url}${path}`)
  if (response.status !== status) {
    throw new Error(`Expected ${path} to return ${status}, received ${response.status}: ${await response.text()}`)
  }
  assert(await response.json() as Record<string, unknown>)
}
