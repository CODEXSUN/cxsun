import { Kysely, MysqlDialect, sql } from 'kysely'
import { createPool, type PoolOptions } from 'mysql2'
import { createConnection } from 'mysql2/promise'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/tenant.types.js'
import { dbConfig, settings } from '../../framework/config/index.js'
import { hashPassword } from '../auth/password-hash.js'
import { getDatabase } from '../database/connection.js'
import { nowIso } from '../database/database-module.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

const connections = new Map<string, TenantDatabase>()

export function getTenantDatabase(tenant: Tenant): TenantDatabase {
  const existing = connections.get(tenant.slug)
  if (existing) return existing

  const database = new Kysely<TenantDatabaseSchema>({
    dialect: new MysqlDialect({
      pool: createPool({
        host: tenant.db_host,
        port: tenant.db_port,
        user: tenant.db_user,
        password: getTenantDatabasePassword(tenant.db_secret_ref),
        database: tenant.db_name,
        dateStrings: ['DATE'],
        connectionLimit: dbConfig.tenant.connectionLimit,
        connectTimeout: dbConfig.tenant.connectTimeoutMs,
      } satisfies PoolOptions),
    }),
  })

  connections.set(tenant.slug, database)
  return database
}

export async function closeTenantDatabase(tenant: Tenant): Promise<void> {
  const existing = connections.get(tenant.slug)
  if (!existing) return
  connections.delete(tenant.slug)
  await existing.destroy()
}

export async function dropTenantDatabase(tenant: Tenant): Promise<void> {
  await closeTenantDatabase(tenant)
  const connection = await createTenantServerConnection(tenant)
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${tenant.db_name}\``)
  } finally {
    await connection.end()
  }
}

export async function tenantDatabaseExists(tenant: Tenant): Promise<boolean> {
  const connection = await createTenantServerConnection(tenant)
  try {
    const [rows] = await connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
      [tenant.db_name],
    )
    return Array.isArray(rows) && rows.length > 0
  } finally {
    await connection.end()
  }
}

export async function provisionTenantDatabase(tenant: Tenant, options: { schemaOnly?: boolean } = {}) {
  const connection = await createTenantServerConnection(tenant)
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${tenant.db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await connection.end()
  }

  const database = getTenantDatabase(tenant)
  await migrateTenantCoreTables(database)
  await recordTenantDatabaseVersion(database, tenant)

  if (!options.schemaOnly) {
    await seedTenantCore(database, tenant)
    await syncTenantCompanyMetrics(tenant)
  }
}

export async function setupTenantClientDatabase(tenant: Tenant) {
  await provisionTenantDatabase(tenant)
  const database = getTenantDatabase(tenant)
  const company = await ensureTenantDefaultCompany(database, tenant)
  const adminSeed = tenantAdminSeed()
  const admin = adminSeed
    ? await ensureTenantUser(database, {
      name: adminSeed.name,
      email: adminSeed.email,
      passwordHash: hashPassword(adminSeed.password),
      role: 'admin',
      status: 'active',
    })
    : null

  await syncTenantCompanyMetrics(tenant)

  return {
    ok: true,
    tenantId: tenant.id,
    database: tenant.db_name,
    company,
    admin: adminSeed && admin
      ? { id: admin, name: adminSeed.name, email: adminSeed.email, role: 'admin', status: 'active' }
      : null,
  }
}

export async function ensureTenantUser(
  database: TenantDatabase,
  user: { name: string; email: string; passwordHash: string; role: string; status?: string },
) {
  const existing = await database.selectFrom('users').select('id').where('email', '=', user.email).executeTakeFirst()
  const row = {
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    status: user.status ?? 'active',
    updated_at: new Date(),
  }

  let userId = existing?.id
  if (existing) {
    await database.updateTable('users').set(row).where('id', '=', existing.id).execute()
  } else {
    await database.insertInto('users').values({ ...row, uuid: nextLocalUuid() }).execute()
    userId = (await database.selectFrom('users').select('id').where('email', '=', user.email).executeTakeFirstOrThrow()).id
  }

  await ensureTenantUserAccess(database, Number(userId), user.role, user.status ?? 'active')
  return Number(userId)
}

export async function syncTenantCompanyMetrics(tenant: Tenant): Promise<void> {
  const database = getTenantDatabase(tenant)
  const metrics = await sql<{
    company_count: number | string | bigint | null
    active_company_count: number | string | bigint | null
    company_concept_count: number | string | bigint | null
  }>`
    SELECT
      COUNT(*) AS company_count,
      SUM(CASE WHEN is_active = 1 AND status = 'active' THEN 1 ELSE 0 END) AS active_company_count,
      0 AS company_concept_count
    FROM companies
    WHERE deleted_at IS NULL
  `.execute(database)

  const row = metrics.rows[0]
  await getDatabase()
    .updateTable('tenants')
    .set({
      company_count: toMetricNumber(row?.company_count),
      active_company_count: toMetricNumber(row?.active_company_count),
      company_concept_count: toMetricNumber(row?.company_concept_count),
      updated_at: nowIso(),
    })
    .where('id', '=', tenant.id)
    .execute()
}

async function migrateTenantCoreTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS db_versions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      scope VARCHAR(32) NOT NULL,
      target_key VARCHAR(191) NOT NULL,
      version VARCHAR(64) NOT NULL,
      source VARCHAR(64) NOT NULL,
      metadata JSON NULL,
      installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_db_versions_scope_target (scope, target_key)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      tenant_id INT NOT NULL,
      industry_id INT NOT NULL DEFAULT 0,
      code VARCHAR(64) NOT NULL,
      name VARCHAR(191) NOT NULL,
      legal_name VARCHAR(220) NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      settings LONGTEXT NOT NULL,
      features LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_companies_code (code)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS accounting_years (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      name VARCHAR(80) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      books_start DATE NOT NULL,
      is_current_year TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS user_tenants (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      user_id INT NOT NULL,
      role VARCHAR(80) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_tenants_user (user_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS rbac_roles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      settings LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS rbac_policies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      code VARCHAR(128) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS rbac_role_policies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      role_code VARCHAR(64) NOT NULL,
      policy_code VARCHAR(128) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_role_policy (role_code, policy_code)
    )
  `).execute(database)
}

async function seedTenantCore(database: TenantDatabase, tenant: Tenant) {
  await ensureTenantDefaultCompany(database, tenant)
  await ensureCurrentAccountingYear(database)
  for (const role of [
    { code: 'admin', name: 'Admin', settings: { system: true, canAssignRoles: ['manager', 'staff', 'user'] } },
    { code: 'manager', name: 'Manager', settings: { system: true, canAssignRoles: ['staff', 'user'] } },
    { code: 'staff', name: 'Staff', settings: { system: true, canEditData: true } },
    { code: 'user', name: 'User', settings: { system: true } },
  ]) {
    await ensureRole(database, role)
  }

  for (const policy of [
    { code: 'company.manage', name: 'Manage companies', description: 'Allows managing companies inside this tenant database.' },
    { code: 'rbac.manage', name: 'Manage RBAC', description: 'Allows managing tenant-local roles and policy assignments.' },
    { code: 'mail.manage', name: 'Manage mail', description: 'Allows configuring tenant mail settings and sending tenant mail.' },
  ]) {
    await ensurePolicy(database, policy)
  }

  for (const roleCode of ['admin', 'manager', 'staff', 'user']) await ensureRolePolicy(database, roleCode, 'company.manage')
  await ensureRolePolicy(database, 'admin', 'rbac.manage')
  for (const roleCode of ['admin', 'manager', 'staff']) await ensureRolePolicy(database, roleCode, 'mail.manage')
}

async function ensureCurrentAccountingYear(database: TenantDatabase) {
  const existing = await database
    .selectFrom('accounting_years')
    .select('id')
    .where('is_current_year', '=', true)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()
  if (existing) return

  const year = financialYearSeed(currentFinancialYearStart(new Date()))
  await database.insertInto('accounting_years').values({
    uuid: nextLocalUuid(),
    name: year.name,
    start_date: year.startDate,
    end_date: year.endDate,
    books_start: year.startDate,
    is_current_year: true,
    is_active: true,
  }).execute()
}

function currentFinancialYearStart(date: Date) {
  const year = date.getFullYear()
  return date.getMonth() >= 3 ? year : year - 1
}

function financialYearSeed(startYear: number) {
  return {
    name: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  }
}

async function ensureTenantDefaultCompany(database: TenantDatabase, tenant: Tenant) {
  const existing = await database
    .selectFrom('companies')
    .select(['id', 'name', 'code'])
    .where('deleted_at', 'is', null)
    .orderBy('is_primary', 'desc')
    .orderBy('id', 'asc')
    .executeTakeFirst()

  if (existing) return { id: Number(existing.id), name: existing.name, code: existing.code }

  const code = tenant.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || `TENANT_${tenant.id}`
  await database
    .insertInto('companies')
    .values({
      uuid: nextLocalUuid(),
      tenant_id: tenant.id,
      industry_id: 0,
      code,
      name: tenant.name,
      legal_name: tenant.name,
      is_primary: true,
      is_active: true,
      status: 'active',
      settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
      features: JSON.stringify(['company.manage']),
    })
    .execute()

  const company = await database.selectFrom('companies').select(['id', 'name', 'code']).where('code', '=', code).executeTakeFirstOrThrow()
  return { id: Number(company.id), name: company.name, code: company.code }
}

async function ensureTenantUserAccess(database: TenantDatabase, userId: number, role: string, status: string) {
  const existing = await database.selectFrom('user_tenants').select('id').where('user_id', '=', userId).where('role', '=', role).executeTakeFirst()
  const row = { user_id: userId, role, status, updated_at: new Date() }
  if (existing) {
    await database.updateTable('user_tenants').set(row).where('id', '=', existing.id).execute()
    return
  }
  await database.insertInto('user_tenants').values({ ...row, uuid: nextLocalUuid() }).execute()
}

async function ensureRole(database: TenantDatabase, role: { code: string; name: string; settings: Record<string, unknown> }) {
  const existing = await database.selectFrom('rbac_roles').select('id').where('code', '=', role.code).executeTakeFirst()
  const row = { name: role.name, settings: JSON.stringify(role.settings), updated_at: new Date() }
  if (existing) {
    await database.updateTable('rbac_roles').set(row).where('id', '=', existing.id).execute()
    return
  }
  await database.insertInto('rbac_roles').values({ uuid: nextLocalUuid(), code: role.code, ...row }).execute()
}

async function ensurePolicy(database: TenantDatabase, policy: { code: string; name: string; description: string }) {
  const existing = await database.selectFrom('rbac_policies').select('id').where('code', '=', policy.code).executeTakeFirst()
  if (existing) return
  await database.insertInto('rbac_policies').values({ ...policy, uuid: nextLocalUuid() }).execute()
}

async function ensureRolePolicy(database: TenantDatabase, roleCode: string, policyCode: string) {
  const existing = await database
    .selectFrom('rbac_role_policies')
    .select('id')
    .where('role_code', '=', roleCode)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()
  if (existing) return
  await database.insertInto('rbac_role_policies').values({ uuid: nextLocalUuid(), role_code: roleCode, policy_code: policyCode }).execute()
}

async function recordTenantDatabaseVersion(database: TenantDatabase, tenant: Tenant) {
  await sql`
    INSERT INTO db_versions (scope, target_key, version, source, metadata)
    VALUES ('tenant', ${tenant.slug}, ${settings.package.version}, 'platform-api-tenant-core', ${JSON.stringify({ tenantId: tenant.id, database: tenant.db_name, recordedAt: new Date().toISOString() })})
    ON DUPLICATE KEY UPDATE
      version = VALUES(version),
      source = VALUES(source),
      metadata = VALUES(metadata),
      updated_at = CURRENT_TIMESTAMP
  `.execute(database)
}

function tenantAdminSeed() {
  const email = process.env.TENANT_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.TENANT_ADMIN_PASSWORD?.trim()
  if (!email || !password) return null
  return { name: process.env.TENANT_ADMIN_NAME?.trim() || 'Tenant Admin', email, password }
}

function createTenantServerConnection(tenant: Tenant) {
  return createConnection({
    host: tenant.db_host,
    port: tenant.db_port,
    user: tenant.db_user,
    password: getTenantDatabasePassword(tenant.db_secret_ref),
    multipleStatements: false,
    connectTimeout: dbConfig.tenant.connectTimeoutMs,
  })
}

function getTenantDatabasePassword(secretRef: string) {
  return dbConfig.tenant.password(secretRef)
}

function nextLocalUuid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function toMetricNumber(value: number | string | bigint | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}
