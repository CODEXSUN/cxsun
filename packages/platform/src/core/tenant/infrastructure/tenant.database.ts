import { createConnection } from 'mysql2/promise'
import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule, type PlatformDatabase } from '../../../infrastructure/database/database-module.js'
import { liveClientScopes, type LiveClientScope } from '../live-client-scope.js'
import { dbConfig } from '../../../framework/config/index.js'

const legacyCodexsunTenantName = ['CODEXSUN', 'Shared', 'Billing'].join(' ')

export const tenantDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code INT NOT NULL UNIQUE,
        corporate_id VARCHAR(80) NULL UNIQUE,
        mobile VARCHAR(32) NULL UNIQUE,
        slug VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        db_type VARCHAR(32) NOT NULL DEFAULT 'mariadb',
        db_host VARCHAR(191) NOT NULL,
        db_port INT NOT NULL,
        db_name VARCHAR(191) NOT NULL,
        db_user VARCHAR(191) NOT NULL,
        db_secret_ref VARCHAR(191) NOT NULL,
        company_count INT NOT NULL DEFAULT 0,
        active_company_count INT NOT NULL DEFAULT 0,
        company_concept_count INT NOT NULL DEFAULT 0,
        payload_settings LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )
  `).execute(database)
  },
  async seed(database) {
    for (const client of liveClientScopes) {
      await ensureLiveClientTenant(database, client)
    }

    await seedTenantLoginIdentifiers(database)
  },
}

async function ensureLiveClientTenant(database: PlatformDatabase, client: LiveClientScope) {
  const now = nowIso()
  const defaultPayloadSettings = {
    ui: { density: 'comfortable' },
    industry: {
      code: client.industry,
      name: client.industryName,
    },
    apps: {
      enabled: client.apps,
      landing: client.landingApp,
    },
    liveScope: {
      companies: client.companies,
      requirements: client.requirements,
      notes: client.notes,
      domains: client.domains,
    },
    features: [
      'company.manage',
      ...client.requirements.map((requirement) => `scope.${requirement}`),
    ],
  }

  const existing = await database
    .selectFrom('tenants')
    .select(['id', 'slug', 'name', 'db_host', 'db_port', 'db_name', 'db_user', 'db_secret_ref', 'payload_settings'])
    .where((eb) => eb.or([
      eb('slug', '=', client.slug),
      eb('code', '=', client.code),
      eb('corporate_id', '=', client.corporateId),
    ]))
    .executeTakeFirst()

  const row = {
    code: client.code,
    corporate_id: client.corporateId,
    mobile: null,
    slug: client.slug,
    name: client.name,
    status: 'active',
    db_type: 'mariadb',
    db_host: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
    db_port: Number(process.env.TENANT_DB_PORT || process.env.DB_PORT || 3306),
    db_name: client.database,
    db_user: process.env.TENANT_DB_USER || process.env.DB_USER || 'root',
    db_secret_ref: process.env.TENANT_DB_SECRET_REF || 'DB_PASSWORD',
    company_count: client.companies.length,
    active_company_count: client.companies.length,
    company_concept_count: client.companies.length,
    payload_settings: JSON.stringify(mergeLiveClientPayloadSettings(defaultPayloadSettings, existing?.payload_settings)),
    deleted_at: null,
    updated_at: now,
  }

  if (existing) {
    if (await tenantDatabaseExists({
      db_host: existing.db_host,
      db_port: Number(existing.db_port),
      db_name: existing.db_name,
      db_user: existing.db_user,
      db_secret_ref: existing.db_secret_ref,
    })) {
      await renameLegacyCodexsunTenant(database, existing)
      return
    }

    await database
      .updateTable('tenants')
      .set(row)
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('tenants')
    .values({
      ...row,
    })
    .execute()
}

function mergeLiveClientPayloadSettings(
  defaults: Record<string, unknown> & { apps: { enabled: string[]; landing: string } },
  existingValue: string | null | undefined,
) {
  const existing = parseJsonObject(existingValue)
  const existingApps = isJsonRecord(existing.apps) ? existing.apps : {}
  const existingEnabled = Array.isArray(existingApps.enabled)
    ? existingApps.enabled.map(String).map((app) => app.trim()).filter(Boolean)
    : null
  const existingLanding = typeof existingApps.landing === 'string' && existingApps.landing.trim()
    ? existingApps.landing.trim()
    : null

  return {
    ...defaults,
    ...existing,
    apps: {
      ...defaults.apps,
      ...existingApps,
      enabled: existingEnabled ?? defaults.apps.enabled,
      landing: existingLanding ?? defaults.apps.landing,
    },
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}') as unknown
    return isJsonRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function renameLegacyCodexsunTenant(
  database: PlatformDatabase,
  tenant: { id: number; slug: string; name: string },
) {
  if (tenant.slug !== 'codexsun' || tenant.name !== legacyCodexsunTenantName) {
    return
  }

  await database
    .updateTable('tenants')
    .set({
      name: 'CODEXSUN',
      updated_at: nowIso(),
    })
    .where('id', '=', tenant.id)
    .execute()
}

async function tenantDatabaseExists(tenant: {
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
}): Promise<boolean> {
  const connection = await createConnection({
    host: tenant.db_host,
    port: tenant.db_port,
    user: tenant.db_user,
    password: dbConfig.tenant.password(tenant.db_secret_ref),
    multipleStatements: false,
    connectTimeout: dbConfig.tenant.connectTimeoutMs,
  })

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

async function seedTenantLoginIdentifiers(database: PlatformDatabase) {
  const tenants = await database
    .selectFrom('tenants')
    .select(['id', 'code', 'slug', 'corporate_id', 'mobile'])
    .where('deleted_at', 'is', null)
    .orderBy('code', 'asc')
    .execute()

  for (const tenant of tenants) {
    const isDefaultTenant = tenant.slug === 'codexsun'
    const corporateId = tenant.corporate_id?.trim() || (isDefaultTenant ? 'CODEXSUN' : tenant.slug.toUpperCase())
    const mobile = tenant.mobile?.trim() || (isDefaultTenant ? '9655227738' : null)
    const corporateIdChanged = corporateId !== (tenant.corporate_id ?? null)
    const mobileChanged = mobile !== (tenant.mobile ?? null)

    if (!corporateIdChanged && !mobileChanged) {
      continue
    }

    await database
      .updateTable('tenants')
      .set({
        corporate_id: corporateId,
        mobile,
        updated_at: nowIso(),
      })
      .where('id', '=', tenant.id)
      .execute()
  }
}
