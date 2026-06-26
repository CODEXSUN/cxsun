import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '../src/infrastructure/database/connection.js'
import { hashPassword } from '../src/infrastructure/auth/password-hash.js'
import { closeTenantDatabase, dropTenantDatabase, getTenantDatabase } from '../src/infrastructure/tenant-database/tenant-database.connection.js'
import { startPlatformApi } from '../src/runtime.js'

const port = Number(process.env.PLATFORM_API_E2E_PORT ?? 6197)
const marker = `cxsun_e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const adminEmail = `${marker}@example.test`
const adminPassword = `Password-${marker}`
const industryCode = `E2E_${marker}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 60)
const tenantSlug = marker.replace(/[^a-z0-9_]/g, '_')
const tenantCorporateId = `E2E_${tenantSlug}`.toUpperCase()
const domainName = `${tenantSlug}.example.test`
const policyCode = `e2e.${tenantSlug}.manage`
const appCode = `e2e-${tenantSlug}`.slice(0, 70)

const runtime = await startPlatformApi({ port })
let failure: unknown
let tenantId: number | undefined
let industryId: number | undefined
let domainId: number | undefined
let tenantForCleanup: Record<string, unknown> | undefined

try {
  await cleanupStaleE2eRows()
  await seedE2eAdmin()

  const login = await postJson('/api/v1/auth/login', {
    surface: 'super-admin',
    email: adminEmail,
    password: adminPassword,
  })
  assertOk(login, 'super-admin login')
  const token = stringValue(login.token, 'login token')
  const auth = { authorization: `Bearer ${token}` }

  const session = await getJson('/api/v1/auth/session', auth)
  assertOk(session, 'session')
  assertEqual(objectValue(session.selectedTenant, 'selectedTenant').slug, 'super-admin', 'selected tenant slug')

  const adminUsers = await getJson('/api/v1/admin-users', auth)
  assertArray(adminUsers, 'admin users')
  assertTruthy(adminUsers.some((user) => objectValue(user, 'admin user').email === adminEmail), 'admin user is listed')

  const createdIndustry = await postJson('/api/v1/industries/upsert', {
    code: industryCode,
    name: `E2E Industry ${marker}`,
    status: 'active',
    payload_schema: { source: 'platform-api-e2e' },
    default_features: ['billing'],
    default_ui_settings: { accent: 'test' },
  }, auth)
  assertOk(createdIndustry, 'industry create')
  const industry = objectValue(createdIndustry.industry, 'industry')
  industryId = numberValue(industry.id, 'industry id')
  const savedIndustryCode = stringValue(industry.code, 'industry code')

  const industries = await getJson('/api/v1/industries', auth)
  assertArray(industries, 'industries')
  assertTruthy(industries.some((row) => objectValue(row, 'industry row').code === savedIndustryCode), 'industry is listed')
  assertOk(await postJson(`/api/v1/industries/${industryId}/destroy`, {}, auth), 'industry suspend')
  assertOk(await postJson(`/api/v1/industries/${industryId}/restore`, {}, auth), 'industry restore')

  const createdTenant = await postJson('/api/v1/tenants/upsert', {
    name: `E2E Tenant ${marker}`,
    slug: tenantSlug,
    corporate_id: tenantCorporateId,
    status: 'active',
    payload_settings: {
      apps: { enabled: ['billing', 'crm'], landing: 'billing' },
      features: ['offline-sync'],
      e2e: marker,
    },
  }, auth)
  assertOk(createdTenant, 'tenant create')
  const tenant = objectValue(createdTenant.tenant, 'tenant')
  tenantForCleanup = tenant
  tenantId = numberValue(tenant.id, 'tenant id')
  assertEqual(tenant.slug, tenantSlug, 'tenant slug')

  const setupStatus = await getJson(`/api/v1/tenants/${tenantId}/setup-status`, auth)
  assertOk(setupStatus, 'tenant setup status')
  assertEqual(setupStatus.database, `${tenantSlug}_db`, 'tenant database name')

  assertOk(await postJson(`/api/v1/tenants/${tenantId}/setup-client`, {}, auth), 'tenant core setup')
  const tenantDatabase = getTenantDatabase(tenant as never)
  assertEqual(await tenantTableExists(tenantDatabase, 'companies'), true, 'platform core tenant tables are provisioned')
  assertEqual(await tenantTableExists(tenantDatabase, 'sales_entries'), false, 'platform setup does not own billing app tables')
  assertEqual(await tenantTableExists(tenantDatabase, 'ecommerce_store_settings'), false, 'platform setup does not own ecommerce app tables')
  assertEqual(await tenantTableExists(tenantDatabase, 'site_sliders'), false, 'platform setup does not own site app tables')

  const companies = await getJson(`/api/v1/tenants/${tenantId}/companies`, auth)
  assertOk(companies, 'tenant companies')
  assertArray(companies.companies, 'tenant companies rows')
  assertTruthy(companies.companies.length > 0, 'tenant company seeded')

  const accountingYears = await getJson(`/api/v1/tenants/${tenantId}/accounting-years`, auth)
  assertOk(accountingYears, 'tenant accounting years')
  assertArray(accountingYears.accountingYears, 'tenant accounting year rows')
  assertTruthy(accountingYears.accountingYears.length > 0, 'tenant accounting year seeded')

  assertOk(await postJson('/api/v1/rbac/policies/upsert', {
    code: policyCode,
    name: `E2E Policy ${marker}`,
    description: 'E2E RBAC policy',
  }, auth), 'rbac policy upsert')
  assertOk(await postJson(`/api/v1/tenants/${tenantId}/rbac/policies/upsert`, {
    policy_code: policyCode,
    enabled: true,
  }, auth), 'tenant rbac policy upsert')
  const policyCheck = await postJson('/api/v1/rbac/check', { tenant_id: tenantId, role: 'admin', policy_code: 'company.manage' }, auth)
  assertOk(policyCheck, 'rbac check')
  assertEqual(policyCheck.allowed, true, 'admin company manage policy allowed')

  assertOk(await postJson('/api/v1/app-registry/upsert', {
    code: appCode,
    name: `E2E App ${marker}`,
    category: 'e2e',
    metadata: { marker },
  }, auth), 'app registry upsert')
  assertOk(await postJson(`/api/v1/tenants/${tenantId}/apps/upsert`, {
    enabled: ['billing', 'crm', appCode],
    landing: appCode,
  }, auth), 'tenant app enablement')
  const tenantApps = await getJson(`/api/v1/tenants/${tenantId}/apps`, auth)
  assertOk(tenantApps, 'tenant apps')
  assertTruthy(Array.isArray(objectValue(tenantApps.apps, 'tenant apps').enabled), 'tenant apps enabled array')

  const tokenCreated = await postJson('/api/v1/service-tokens', {
    name: `E2E Token ${marker}`,
    service_code: `billing-${tenantSlug}`,
    scopes: ['tenant.read', 'billing.sales.create'],
  }, auth)
  assertOk(tokenCreated, 'service token create')
  const serviceToken = stringValue(objectValue(tokenCreated.serviceToken, 'service token').token, 'plain service token')
  const tokenVerified = await postJson('/api/v1/service-tokens/verify', { token: serviceToken })
  assertOk(tokenVerified, 'service token verify')
  assertEqual(tokenVerified.valid, true, 'service token valid')

  assertOk(await postJson('/api/v1/audit-events', {
    actor_type: 'e2e',
    actor_id: marker,
    event_type: 'platform.e2e.completed',
    target_type: 'tenant',
    target_id: tenantSlug,
    tenant_id: tenantId,
    payload: { marker },
  }, auth), 'audit event create')
  assertOk(await postJson('/api/v1/notifications', {
    tenant_id: tenantId,
    channel: 'in-app',
    subject: `E2E notification ${marker}`,
    body: 'Platform API e2e notification.',
    payload: { marker },
  }, auth), 'notification create')
  assertOk(await postJson('/api/v1/mail-requests', {
    tenant_id: tenantId,
    to_email: `${marker}@mail.test`,
    subject: `E2E mail ${marker}`,
    body: 'Platform API e2e mail.',
    payload: { marker },
  }, auth), 'mail request create')
  assertOk(await postJson('/api/v1/files', {
    tenant_id: tenantId,
    owner_type: 'e2e',
    owner_id: marker,
    file_name: `${marker}.txt`,
    mime_type: 'text/plain',
    size_bytes: 10,
    storage_key: `e2e/${marker}.txt`,
    metadata: { marker },
  }, auth), 'file metadata create')
  const queueResult = await postJson('/api/v1/outbox/process', { limit: 50 }, auth)
  assertTruthy(Number(objectValue(queueResult, 'queue result').processed) >= 1, 'queue processed at least one job')

  const tenantContext = await getJson('/api/v1/tenants/context', { 'x-tenant-code': tenantSlug })
  assertOk(tenantContext, 'tenant context')
  assertEqual(objectValue(objectValue(tenantContext.context, 'context').tenant, 'context tenant').slug, tenantSlug, 'context tenant slug')

  const createdDomain = await postJson('/api/v1/tenant-domains/upsert', {
    tenantId,
    domain: domainName,
    label: 'E2E Domain',
    isPrimary: false,
    status: 'active',
    settings: { landing: { mode: 'tenant' }, e2e: marker },
  }, auth)
  assertOk(createdDomain, 'tenant domain create')
  domainId = numberValue(objectValue(createdDomain.domain, 'domain').id, 'domain id')

  const resolvedDomain = await getJson(`/api/v1/tenant-domains/resolve?domain=${encodeURIComponent(domainName)}`, auth)
  assertOk(resolvedDomain, 'tenant domain resolve')
  assertEqual(objectValue(resolvedDomain.tenant, 'resolved tenant').slug, tenantSlug, 'resolved tenant slug')

  assertOk(await postJson(`/api/v1/tenant-domains/${domainId}/delete`, {
    force: true,
    confirmation: domainName,
  }, auth), 'tenant domain delete')
  domainId = undefined

  console.log(`Platform API e2e ok: auth + native module flows + cleanup marker ${marker}`)
} catch (error) {
  failure = error
} finally {
  await cleanupE2eRows()
  await runtime.app.app.close()
  await closeDatabase()
}

if (failure) {
  console.error(failure)
  process.exitCode = 1
}

async function seedE2eAdmin() {
  await getDatabase()
    .insertInto('admin_users')
    .values({
      name: 'Platform API E2E Admin',
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      role: 'super-admin',
      status: 'active',
      updated_at: '2000-01-01 00:00:00',
    })
    .execute()
}

async function cleanupE2eRows() {
  const database = getDatabase()

  if (tenantForCleanup) {
    await closeTenantDatabase(tenantForCleanup as never)
    await dropTenantDatabase(tenantForCleanup as never)
  }

  await database.deleteFrom('platform_files').where('owner_id', '=', marker).execute()
  await database.deleteFrom('platform_mail_requests').where('subject', 'like', `%${marker}%`).execute()
  await database.deleteFrom('platform_notifications').where('subject', 'like', `%${marker}%`).execute()
  await database.deleteFrom('platform_audit_events').where('actor_id', '=', marker).execute()
  await database.deleteFrom('platform_service_tokens').where('name', 'like', `%${marker}%`).execute()
  await database.deleteFrom('platform_apps').where('code', '=', appCode).execute()
  await database.deleteFrom('rbac_policies').where('code', '=', policyCode).execute()

  if (domainId) await database.deleteFrom('tenant_domains').where('id', '=', domainId).execute()
  await database.deleteFrom('tenant_domains').where('domain', '=', domainName).execute()

  if (tenantId) {
    await database.deleteFrom('tenant_rbac_policies').where('tenant_id', '=', tenantId).execute()
    await sql`DELETE FROM queue_jobs WHERE payload LIKE ${`%${tenantSlug}%`}`.execute(database)
    await database.deleteFrom('tenants').where('id', '=', tenantId).execute()
  }

  await database.deleteFrom('tenants').where('slug', '=', tenantSlug).execute()
  if (industryId) await database.deleteFrom('industries').where('id', '=', industryId).execute()
  await database.deleteFrom('industries').where('code', '=', industryCode).execute()
  await database.deleteFrom('admin_users').where('email', '=', adminEmail).execute()
}

async function cleanupStaleE2eRows() {
  const database = getDatabase()
  await database.deleteFrom('tenant_domains').where('domain', 'like', 'cxsun_e2e_%.example.test').execute()
  await database.deleteFrom('tenant_rbac_policies').where('tenant_id', 'in', (eb) => (
    eb.selectFrom('tenants').select('id').where('slug', 'like', 'cxsun_e2e_%')
  )).execute()
  await sql`DELETE FROM queue_jobs WHERE payload LIKE '%cxsun_e2e_%'`.execute(database)
  await database.deleteFrom('platform_files').where('owner_id', 'like', 'cxsun_e2e_%').execute()
  await database.deleteFrom('platform_mail_requests').where('subject', 'like', '%cxsun_e2e_%').execute()
  await database.deleteFrom('platform_notifications').where('subject', 'like', '%cxsun_e2e_%').execute()
  await database.deleteFrom('platform_audit_events').where('actor_id', 'like', 'cxsun_e2e_%').execute()
  await database.deleteFrom('platform_service_tokens').where('name', 'like', '%cxsun_e2e_%').execute()
  await database.deleteFrom('platform_apps').where('code', 'like', 'e2e-cxsun_e2e_%').execute()
  await database.deleteFrom('rbac_policies').where('code', 'like', 'e2e.cxsun_e2e_%.manage').execute()
  await database.deleteFrom('tenants').where('slug', 'like', 'cxsun_e2e_%').execute()
  await database.deleteFrom('industries').where('code', 'like', 'e2e_cxsun_e2e_%').execute()
  await database.deleteFrom('admin_users').where('email', 'like', 'cxsun_e2e_%@example.test').execute()
}

async function getJson(path: string, headers: Record<string, string> = {}) {
  const response = await fetch(`${runtime.url}${path}`, { headers })
  return parseJsonResponse(response, path)
}

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${runtime.url}${path}`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJsonResponse(response, path)
}

async function parseJsonResponse(response: Response, path: string) {
  const body = await response.json() as Record<string, unknown> | unknown[]
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 2xx, received ${response.status}: ${JSON.stringify(body)}`)
  }
  return body
}

function assertOk(body: unknown, label: string): asserts body is Record<string, unknown> {
  const record = objectValue(body, label)
  if (record.ok !== true) throw new Error(`Expected ${label} ok response, received ${JSON.stringify(body)}`)
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected ${label} to be an array, received ${JSON.stringify(value)}`)
}

function assertTruthy(value: unknown, label: string) {
  if (!value) throw new Error(`Expected ${label}`)
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`Expected ${label} ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
}

async function tenantTableExists(database: ReturnType<typeof getTenantDatabase>, tableName: string) {
  const result = await sql<{ table_count: number | string | bigint }>`
    SELECT COUNT(*) AS table_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
  `.execute(database as never)
  return Number(result.rows[0]?.table_count ?? 0) > 0
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object, received ${JSON.stringify(value)}`)
  }
  return value as Record<string, unknown>
}

function stringValue(value: unknown, label: string) {
  if (typeof value !== 'string' || !value) throw new Error(`Expected ${label} to be a string, received ${JSON.stringify(value)}`)
  return value
}

function numberValue(value: unknown, label: string) {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Expected ${label} to be a positive integer, received ${JSON.stringify(value)}`)
  return number
}
