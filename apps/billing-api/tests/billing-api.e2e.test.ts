import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { startBillingApi } from '../src/runtime.js'

const port = Number(process.env.BILLING_API_E2E_PORT ?? 6297)
const runtime = await startBillingApi({ port })
let failure: unknown

try {
  const health = await getJson('/health')
  if (health.status !== 'ok') throw new Error(`Expected health ok, received ${JSON.stringify(health)}`)

  const moduleChecks = [
    ['sales', '/api/v1/entries/sales'],
    ['quotation', '/api/v1/entries/quotation'],
    ['export-sales', '/api/v1/entries/export-sales'],
    ['purchase', '/api/v1/entries/purchase'],
    ['receipt', '/api/v1/entries/receipt'],
    ['payment', '/api/v1/entries/payment'],
    ['accounts-ledgers', '/api/v1/accounts/ledgers/customer'],
    ['accounts-vouchers', '/api/v1/accounts/vouchers'],
    ['accounts-day-book', '/api/v1/accounts/reports/day-book'],
    ['accounts-trial-balance', '/api/v1/accounts/reports/trial-balance'],
    ['accounts-profit-loss', '/api/v1/accounts/reports/profit-loss'],
    ['accounts-balance-sheet', '/api/v1/accounts/reports/balance-sheet'],
    ['accounts-cash-book', '/api/v1/accounts/books/cash'],
    ['accounts-bank-book', '/api/v1/accounts/books/bank'],
    ['accounts-period-locks', '/api/v1/accounts/period-locks'],
    ['purchase-receipt', '/api/v1/stock/inward/purchase-receipts'],
    ['delivery-note', '/api/v1/stock/outward/delivery-notes'],
    ['stock-ledger', '/api/v1/stock/ledger/entries'],
    ['contacts', '/api/v1/contacts'],
    ['contacts-next-code', '/api/v1/contacts/next-code'],
    ['products', '/api/v1/products'],
    ['orders', '/api/v1/orders'],
  ] as const

  for (const [name, path] of moduleChecks) {
    const response = await fetch(`${runtime.url}${path}`)
    if (![401, 403].includes(response.status)) throw new Error(`Expected ${name} route to be protected, received ${response.status}`)
  }

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) throw new Error('Expected MariaDB database name in e2e.')

  console.log(`Billing API e2e ok: ${moduleChecks.length} route families protected + MariaDB ${databaseName}`)
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
