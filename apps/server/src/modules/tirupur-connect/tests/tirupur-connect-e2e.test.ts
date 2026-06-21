import assert from 'node:assert/strict'
import { CxApp } from '../../../core/bootstrap.js'
import { signJwt } from '../../../infrastructure/auth/jwt.js'
import { closeDatabase, initializeDatabase } from '../../../infrastructure/database/connection.js'
import { closeTirupurConnectDatabase, getTirupurConnectDatabase, initializeTirupurConnectDatabase } from '../infrastructure/database/tirupur-connect.connection.js'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import { AppModule } from '../../index.js'

const port = 6101
const base = `http://127.0.0.1:${port}/api/v1/tirupur-connect`
const suffix = `${Date.now()}`
const supplierEmail = `supplier-${suffix}@example.test`
const buyerEmail = `buyer-${suffix}@example.test`
const adminEmail = `market-admin-${suffix}@example.test`
let app: Awaited<ReturnType<typeof CxApp.create>> | undefined

try {
  await initializeDatabase()
  await initializeTirupurConnectDatabase()
  app = await CxApp.create(AppModule, { host: '127.0.0.1', port, logLevel: 'error' })
  await app.start()

  const supplier = await api<{ token: string; identity: { accountId: number } }>('/public/register', undefined, {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Supplier', email: supplierEmail, password: 'Password123', role: 'supplier', companyName: 'Test Knit Supplier' }),
  })
  await api('/member/company', supplier.token, {
    method: 'PUT',
    body: JSON.stringify({ name: 'Test Knit Supplier', businessType: 'Garment Manufacturer', city: 'Tirupur', monthlyCapacity: '10000 pcs' }),
  })
  await api('/member/products', supplier.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Organic Cotton T-Shirt', moq: 500, leadTime: '21 days', status: 'submitted' }),
  })
  await api('/member/company/submit', supplier.token, { method: 'POST', body: '{}' })

  const buyer = await api<{ token: string }>('/public/register', undefined, {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Buyer', email: buyerEmail, password: 'Password123', role: 'buyer' }),
  })
  const rfq = await api<{ uuid: string }>('/member/rfqs', buyer.token, {
    method: 'POST',
    body: JSON.stringify({ title: 'Need 5000 organic cotton T-shirts', quantity: 5000, unit: 'pcs', deliveryLocation: 'Chennai' }),
  })

  const database = getTirupurConnectDatabase()
  const adminUuid = generatePublicUuid()
  const adminId = Number((await database.insertInto('tc_accounts').values({
    uuid: adminUuid,
    name: 'Marketplace Test Admin',
    email: adminEmail,
    password_hash: hashPassword('Password123'),
    role: 'marketplace-admin',
    status: 'active',
  }).executeTakeFirst()).insertId)
  const adminToken = signJwt({
    sub: adminId,
    email: adminEmail,
    role: 'marketplace-admin',
    tenantCode: 'tirupur-connect',
    identitySource: 'tirupur-connect',
  })

  const companies = await api<{ records: Array<{ uuid: string }> }>('/admin/companies?status=submitted', adminToken)
  const companyUuid = companies.records.find((row) => row.uuid)?.uuid
  assert.ok(companyUuid, 'Submitted supplier company must appear in admin review.')
  await api(`/admin/companies/${companyUuid}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) })
  await api(`/admin/rfqs/${rfq.uuid}/status`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'open' }) })

  await api(`/member/rfqs/${rfq.uuid}/quotes`, supplier.token, {
    method: 'POST',
    body: JSON.stringify({ pricePerUnit: 220, quantity: 5000, currency: 'INR', leadTime: '20 days' }),
  })
  const verification = await api<{ uuid: string }>('/member/verification-requests', supplier.token, {
    method: 'POST',
    body: JSON.stringify({ level: 'gst', documents: [{ type: 'gst', url: 'https://example.test/gst.pdf' }] }),
  })
  await api(`/admin/verifications/${verification.uuid}/decision`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })
  await api('/admin/content/article', adminToken, {
    method: 'POST',
    body: JSON.stringify({ title: `Textile update ${suffix}`, summary: 'E2E published marketplace article.', status: 'published' }),
  })

  const publicCompanies = await api<{ records: Array<{ uuid: string }> }>('/public/companies')
  const publicRfqs = await api<{ records: Array<{ uuid: string }> }>('/public/rfqs')
  const buyerQuotes = await api<Array<{ rfq_uuid: string }>>('/member/quotes', buyer.token)
  assert.ok(publicCompanies.records.some((row) => row.uuid === companyUuid), 'Published company must be publicly readable.')
  assert.ok(publicRfqs.records.some((row) => row.uuid === rfq.uuid), 'Approved RFQ must be publicly readable.')
  assert.ok(buyerQuotes.some((row) => row.rfq_uuid === rfq.uuid), 'Buyer must receive the supplier quotation.')
  console.log('Tirupur Connect end-to-end test passed.')
} finally {
  await cleanup()
  await app?.app.close()
  await closeDatabase()
  await closeTirupurConnectDatabase()
}

async function api<T = unknown>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(`${path}: ${payload.error ?? response.status}`)
  return payload as T
}

async function cleanup() {
  const database = getTirupurConnectDatabase()
  const accounts = await database.selectFrom('tc_accounts').select('id').where('email', 'in', [supplierEmail, buyerEmail, adminEmail]).execute()
  const accountIds = accounts.map((row) => row.id)
  if (!accountIds.length) return
  const companies = await database.selectFrom('tc_companies').select('id').where('account_id', 'in', accountIds).execute()
  const companyIds = companies.map((row) => row.id)
  const rfqs = await database.selectFrom('tc_rfqs').select('id').where('buyer_account_id', 'in', accountIds).execute()
  const rfqIds = rfqs.map((row) => row.id)
  if (rfqIds.length) await database.deleteFrom('tc_rfq_quotes').where('rfq_id', 'in', rfqIds).execute()
  if (companyIds.length) {
    await database.deleteFrom('tc_verification_requests').where('company_id', 'in', companyIds).execute()
    await database.deleteFrom('tc_memberships').where('company_id', 'in', companyIds).execute()
    await database.deleteFrom('tc_products').where('company_id', 'in', companyIds).execute()
    await database.deleteFrom('tc_company_categories').where('company_id', 'in', companyIds).execute()
  }
  if (rfqIds.length) await database.deleteFrom('tc_rfqs').where('id', 'in', rfqIds).execute()
  if (companyIds.length) await database.deleteFrom('tc_companies').where('id', 'in', companyIds).execute()
  await database.deleteFrom('tc_content').where('title', '=', `Textile update ${suffix}`).execute()
  await database.deleteFrom('tc_audit_logs').where('actor_id', 'in', accountIds).execute()
  await database.deleteFrom('tc_accounts').where('id', 'in', accountIds).execute()
}
