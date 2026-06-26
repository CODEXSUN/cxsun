import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { startBillingApi } from '../src/runtime.js'

const port = Number(process.env.BILLING_API_CONTRACT_PORT ?? 6296)
const runtime = await startBillingApi({ port })
let failure: unknown

try {
  await expectJson('/health', 200, (body) => {
    if (body.status !== 'ok') throw new Error(`Expected health ok, received ${JSON.stringify(body)}`)
  })

  await expectJson('/ready', 200, (body) => {
    if (body.status !== 'ok' || (body.checks as Record<string, unknown> | undefined)?.database !== 'ok') {
      throw new Error(`Expected ready status ok with database check, received ${JSON.stringify(body)}`)
    }
  })

  await expectRequestId('/health')

  for (const path of [
    '/api/v1/entries/sales',
    '/api/v1/entries/quotation',
    '/api/v1/entries/export-sales',
    '/api/v1/entries/purchase',
    '/api/v1/entries/receipt',
    '/api/v1/entries/payment',
    '/api/v1/accounts/ledgers/customer',
    '/api/v1/accounts/vouchers',
    '/api/v1/accounts/reports/day-book',
    '/api/v1/accounts/reports/trial-balance',
    '/api/v1/accounts/reports/profit-loss',
    '/api/v1/accounts/reports/balance-sheet',
    '/api/v1/accounts/books/cash',
    '/api/v1/accounts/books/bank',
    '/api/v1/accounts/period-locks',
    '/api/v1/stock/inward/purchase-receipts',
    '/api/v1/stock/outward/delivery-notes',
    '/api/v1/stock/ledger/entries',
    '/api/v1/contacts',
    '/api/v1/contacts/next-code',
    '/api/v1/products',
    '/api/v1/orders',
  ]) {
    await expectProtected(path)
  }

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) throw new Error('Expected a real MariaDB database connection.')

  console.log(`Billing API contract ok: mounted billing route families + MariaDB ${databaseName}`)
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

async function expectRequestId(path: string) {
  const response = await fetch(`${runtime.url}${path}`)
  const requestId = response.headers.get('x-request-id')
  if (!requestId) {
    throw new Error(`Expected ${path} to include x-request-id response header.`)
  }
}

async function expectJson(path: string, status: number, assert: (body: Record<string, unknown>) => void) {
  const response = await fetch(`${runtime.url}${path}`)
  if (response.status !== status) {
    throw new Error(`Expected ${path} to return ${status}, received ${response.status}: ${await response.text()}`)
  }
  assert(await response.json() as Record<string, unknown>)
}
