import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { startEcommerceApi } from '../src/runtime.js'

const port = Number(process.env.ECOMMERCE_API_E2E_PORT ?? 6397)
const runtime = await startEcommerceApi({ port })
let failure: unknown

try {
  const health = await getJson('/health')
  if (health.status !== 'ok') throw new Error(`Expected health ok, received ${JSON.stringify(health)}`)

  const moduleChecks = [
    ['ecommerce-workspace', '/api/v1/ecommerce'],
    ['ecommerce-dashboard', '/api/v1/ecommerce/dashboard'],
    ['contacts', '/api/v1/contacts'],
    ['products', '/api/v1/products'],
  ] as const

  for (const [name, path] of moduleChecks) {
    const response = await fetch(`${runtime.url}${path}`)
    if (![401, 403].includes(response.status)) throw new Error(`Expected ${name} route to be protected, received ${response.status}`)
  }

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) throw new Error('Expected MariaDB database name in e2e.')

  console.log(`Ecommerce API e2e ok: ${moduleChecks.length} route families protected + MariaDB ${databaseName}`)
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

async function getJson(path: string) {
  const response = await fetch(`${runtime.url}${path}`)
  if (!response.ok) throw new Error(`Expected ${path} to return 2xx, received ${response.status}: ${await response.text()}`)
  return await response.json() as Record<string, unknown>
}
