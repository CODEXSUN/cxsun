import { Kysely, MysqlDialect, sql } from 'kysely'
import { createPool, type PoolOptions } from 'mysql2'
import { createConnection } from 'mysql2/promise'
import type { DatabaseSchema } from './schema.js'
import { dbConfig } from '../../framework/config/index.js'
import { settings } from '../../framework/config/index.js'
import { hashPassword, verifyPassword } from '../auth/password-hash.js'
import { nowIso } from './database-module.js'

let db: Kysely<DatabaseSchema> | null = null

export function getDatabase() {
  if (db) return db
  db = new Kysely<DatabaseSchema>({
    dialect: new MysqlDialect({
      pool: createPool({
        ...dbConfig.master,
        connectionLimit: dbConfig.master.connectionLimit,
        timezone: 'Z',
      } satisfies PoolOptions),
    }),
  })
  return db
}

export async function initializeDatabase() {
  await ensureMasterDatabase()
  await migratePlatformDatabase()
  await seedPlatformDatabase()
}

export async function closeDatabase() {
  if (!db) return
  await db.destroy()
  db = null
}

export async function migratePlatformDatabase() {
  await ensureMasterDatabase()
  const database = getDatabase()
  await migrateVersionTable(database)
  await migrateIndustryTable(database)
  await migrateTenantTable(database)
  await migrateTenantDomainTable(database)
  await migrateAuthRbacTables(database)
  await migratePlatformContractTables(database)
  await migrateQueueTables(database)
  await recordPlatformDatabaseVersion(database)
}

export async function seedPlatformDatabase() {
  const database = getDatabase()
  await seedIndustries(database)
  await seedPolicies(database)
  await seedPlatformApps(database)
  await seedAdminUsers(database)
}

async function ensureMasterDatabase() {
  const connection = await createConnection({
    host: dbConfig.master.host,
    port: dbConfig.master.port,
    user: dbConfig.master.user,
    password: dbConfig.master.password,
    timezone: 'Z',
  })
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.master.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.end()
}

async function migrateVersionTable(database: Kysely<DatabaseSchema>) {
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
}

async function migrateIndustryTable(database: Kysely<DatabaseSchema>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS industries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      payload_schema LONGTEXT NOT NULL,
      default_features LONGTEXT NOT NULL,
      default_ui_settings LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    )
  `).execute(database)
}

async function migrateTenantTable(database: Kysely<DatabaseSchema>) {
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
}

async function migrateTenantDomainTable(database: Kysely<DatabaseSchema>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tenant_domains (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      domain VARCHAR(191) NOT NULL UNIQUE,
      label VARCHAR(191) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      settings LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_tenant_domains_tenant (tenant_id)
    )
  `).execute(database)
}

async function migrateAuthRbacTables(database: Kysely<DatabaseSchema>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(80) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS rbac_policies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(120) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tenant_rbac_policies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      policy_code VARCHAR(120) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tenant_policy (tenant_id, policy_code)
    )
  `).execute(database)
}

async function migratePlatformContractTables(database: Kysely<DatabaseSchema>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_service_tokens (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      service_code VARCHAR(80) NOT NULL,
      scopes LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      last_used_at DATETIME NULL,
      expires_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_platform_service_tokens_hash (token_hash),
      INDEX idx_platform_service_tokens_service (service_code, status)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_audit_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      actor_type VARCHAR(80) NOT NULL,
      actor_id VARCHAR(191) NULL,
      event_type VARCHAR(160) NOT NULL,
      target_type VARCHAR(120) NOT NULL,
      target_id VARCHAR(191) NULL,
      tenant_id INT NULL,
      payload LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_platform_audit_events_tenant (tenant_id, created_at),
      INDEX idx_platform_audit_events_type (event_type, created_at)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_notifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL,
      user_id INT NULL,
      channel VARCHAR(80) NOT NULL,
      subject VARCHAR(240) NOT NULL,
      body TEXT NOT NULL,
      payload LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_platform_notifications_tenant (tenant_id, status)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_mail_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL,
      to_email VARCHAR(191) NOT NULL,
      subject VARCHAR(240) NOT NULL,
      body TEXT NOT NULL,
      payload LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      provider_ref VARCHAR(191) NULL,
      error LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_platform_mail_requests_tenant (tenant_id, status)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_files (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL,
      owner_type VARCHAR(120) NOT NULL,
      owner_id VARCHAR(191) NULL,
      file_name VARCHAR(240) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      storage_key VARCHAR(500) NOT NULL,
      checksum VARCHAR(191) NULL,
      metadata LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_platform_files_owner (owner_type, owner_id),
      INDEX idx_platform_files_tenant (tenant_id, status)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS platform_apps (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      category VARCHAR(80) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      metadata LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
}

async function migrateQueueTables(database: Kysely<DatabaseSchema>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS queue_jobs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      queue_name VARCHAR(80) NOT NULL DEFAULT 'events',
      type VARCHAR(120) NOT NULL,
      payload LONGTEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      progress INT NOT NULL DEFAULT 0,
      result LONGTEXT NULL,
      error LONGTEXT NULL,
      run_at DATETIME NOT NULL,
      started_at DATETIME NULL,
      finished_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_queue_jobs_status_run_at (status, run_at),
      INDEX idx_queue_jobs_queue_status (queue_name, status)
    )
  `).execute(database)
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS queue_runtime_settings (
      setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
      setting_value VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
}

async function seedIndustries(database: Kysely<DatabaseSchema>) {
  for (const industry of [
    { code: 'software', name: 'Software' },
    { code: 'accountant', name: 'Accountant' },
    { code: 'computer', name: 'Computer' },
    { code: 'ecommerce', name: 'Ecommerce' },
    { code: 'marketing', name: 'Marketing' },
    { code: 'offset_printing', name: 'Offset Printing' },
    { code: 'garment', name: 'Garment' },
  ]) {
    const existing = await database.selectFrom('industries').select('id').where('code', '=', industry.code).executeTakeFirst()
    const data = {
      ...industry,
      payload_schema: JSON.stringify({ company: ['profile', 'industryClassification', 'contact'], transaction: ['channel', 'workType', 'status'] }),
      default_features: JSON.stringify(['company.manage']),
      default_ui_settings: JSON.stringify({ accent: 'emerald', terminology: { company: 'Company', transaction: 'Transaction' } }),
      status: 'active',
      deleted_at: null,
      updated_at: nowIso(),
    }
    if (existing) await database.updateTable('industries').set(data).where('id', '=', existing.id).execute()
    else await database.insertInto('industries').values(data).execute()
  }
}

async function seedPolicies(database: Kysely<DatabaseSchema>) {
  for (const policy of [
    { code: 'company.manage', name: 'Manage companies', description: 'Create, update, suspend, and restore companies in a tenant database.' },
    { code: 'rbac.manage', name: 'Manage RBAC', description: 'Manage tenant roles and policy assignments.' },
    { code: 'mail.manage', name: 'Manage mail', description: 'Configure tenant mail settings and send tenant mail.' },
  ]) {
    const existing = await database.selectFrom('rbac_policies').select('id').where('code', '=', policy.code).executeTakeFirst()
    if (!existing) await database.insertInto('rbac_policies').values(policy).execute()
  }
}

async function seedPlatformApps(database: Kysely<DatabaseSchema>) {
  for (const app of [
    { code: 'billing', name: 'Billing', category: 'business' },
    { code: 'ecommerce', name: 'Ecommerce', category: 'business' },
    { code: 'crm', name: 'CRM', category: 'business' },
    { code: 'sites', name: 'Sites', category: 'business' },
    { code: 'cxsync', name: 'CXSync', category: 'operations' },
  ]) {
    const existing = await database.selectFrom('platform_apps').select('id').where('code', '=', app.code).executeTakeFirst()
    const row = { ...app, status: 'active', metadata: JSON.stringify({ seeded: true }), updated_at: nowIso() }
    if (existing) await database.updateTable('platform_apps').set(row).where('id', '=', existing.id).execute()
    else await database.insertInto('platform_apps').values(row).execute()
  }
}

async function seedAdminUsers(database: Kysely<DatabaseSchema>) {
  for (const user of [
    optionalAdminSeed(process.env.SUPER_ADMIN_NAME || 'Super Admin', process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD, 'super-admin'),
    optionalAdminSeed(process.env.SOFTWARE_ADMIN_NAME || 'Software Admin', process.env.SOFTWARE_ADMIN_EMAIL, process.env.SOFTWARE_ADMIN_PASSWORD, 'software-admin'),
  ].filter((user): user is { name: string; email: string; password: string; role: string } => Boolean(user))) {
    await ensureAdminUser(database, user)
  }
}

function optionalAdminSeed(name: string, email: string | undefined, password: string | undefined, role: string) {
  const normalizedEmail = email?.trim().toLowerCase()
  const normalizedPassword = password?.trim()
  if (!normalizedEmail || !normalizedPassword) return null
  return { name: name.trim() || role, email: normalizedEmail, password: normalizedPassword, role }
}

async function ensureAdminUser(database: Kysely<DatabaseSchema>, data: { name: string; email: string; password: string; role: string }) {
  const existing = await database.selectFrom('admin_users').select(['id', 'name', 'email', 'password_hash', 'role', 'status']).where('email', '=', data.email).executeTakeFirst()
  if (existing) {
    const update: { name?: string; password_hash?: string; role?: string; status?: string; updated_at?: string } = {}
    if (existing.name !== data.name) update.name = data.name
    if (!verifyPassword(data.password, existing.password_hash)) update.password_hash = hashPassword(data.password)
    if (existing.role !== data.role) update.role = data.role
    if (existing.status !== 'active') update.status = 'active'
    if (Object.keys(update).length > 0) await database.updateTable('admin_users').set({ ...update, updated_at: nowIso() }).where('id', '=', existing.id).execute()
    return
  }
  await database.insertInto('admin_users').values({
    name: data.name,
    email: data.email,
    password_hash: hashPassword(data.password),
    role: data.role,
    status: 'active',
    updated_at: nowIso(),
  }).execute()
}

async function recordPlatformDatabaseVersion(database: Kysely<DatabaseSchema>) {
  await sql`
    INSERT INTO db_versions (scope, target_key, version, source, metadata)
    VALUES ('master', ${dbConfig.master.database}, ${settings.package.version}, 'platform-api-migration', ${JSON.stringify({ database: dbConfig.master.database, recordedAt: new Date().toISOString() })})
    ON DUPLICATE KEY UPDATE
      version = VALUES(version),
      source = VALUES(source),
      metadata = VALUES(metadata),
      updated_at = CURRENT_TIMESTAMP
  `.execute(database)
}
