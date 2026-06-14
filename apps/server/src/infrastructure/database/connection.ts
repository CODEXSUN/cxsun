import { Kysely, MysqlDialect, sql } from 'kysely'
import { createPool, type PoolOptions } from 'mysql2'
import { createConnection } from 'mysql2/promise'
import type { DatabaseSchema } from './schema.js'
import { dbConfig } from '../../framework/config/index.js'
import { settings } from '../../framework/config/settings.js'

let db: Kysely<DatabaseSchema> | null = null

export function getMasterDatabaseConfig() {
  return dbConfig.master
}

export function getDatabase() {
  if (db) {
    return db
  }

  const config = getMasterDatabaseConfig()

  db = new Kysely<DatabaseSchema>({
    dialect: new MysqlDialect({
      pool: createPool({
        ...config,
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

export async function migratePlatformDatabase() {
  await ensureMasterDatabase()
  const database = getDatabase()
  const { platformDatabaseModules } = await import('./platform-modules.js')

  await ensurePlatformVersionTable(database)
  for (const databaseModule of platformDatabaseModules) {
    await databaseModule.migrate(database)
  }
  await recordPlatformDatabaseVersion(database)
}

export async function seedPlatformDatabase() {
  await ensureMasterDatabase()
  const database = getDatabase()
  const { platformDatabaseModules } = await import('./platform-modules.js')

  for (const databaseModule of platformDatabaseModules) {
    await databaseModule.seed?.(database)
  }
}

export async function closeDatabase() {
  if (!db) {
    return
  }

  await db.destroy()
  db = null
}

export async function dropPlatformDatabase() {
  await closeDatabase()
  const config = getMasterDatabaseConfig()
  const rootConnection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await rootConnection.query(`DROP DATABASE IF EXISTS \`${config.database}\``)
  await rootConnection.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await rootConnection.end()
}

async function ensureMasterDatabase() {
  const config = getMasterDatabaseConfig()
  const rootConnection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await rootConnection.end()
}

export async function dropPlatformTables() {
  const database = getDatabase()
  await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(database)
  for (const table of [
    'db_versions',
    'queue_jobs',
    'gst_provider_global_settings',
    'tenant_rbac_policies',
    'rbac_policies',
    'admin_users',
    'tenant_domains',
    'tenants',
    'industries',
    'site_messages',
    'site_posts',
    'site_services',
    'site_pages',
  ]) {
    await sql.raw(`DROP TABLE IF EXISTS \`${table}\``).execute(database)
  }
  await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(database)
}

async function ensurePlatformVersionTable(database: Kysely<DatabaseSchema>) {
  await database.schema
    .createTable('db_versions')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('scope', 'varchar(32)', (col) => col.notNull())
    .addColumn('target_key', 'varchar(191)', (col) => col.notNull())
    .addColumn('version', 'varchar(64)', (col) => col.notNull())
    .addColumn('source', 'varchar(64)', (col) => col.notNull())
    .addColumn('metadata', 'json')
    .addColumn('installed_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint('uq_db_versions_scope_target', ['scope', 'target_key'])
    .execute()
}

async function recordPlatformDatabaseVersion(database: Kysely<DatabaseSchema>) {
  await database
    .insertInto('db_versions')
    .values({
      scope: 'master',
      target_key: dbConfig.master.database,
      version: settings.package.version,
      source: 'platform-migration',
      metadata: JSON.stringify({
        database: dbConfig.master.database,
        host: dbConfig.master.host,
        recordedAt: new Date().toISOString(),
      }),
    })
    .onDuplicateKeyUpdate({
      version: settings.package.version,
      source: 'platform-migration',
      metadata: JSON.stringify({
        database: dbConfig.master.database,
        host: dbConfig.master.host,
        recordedAt: new Date().toISOString(),
      }),
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .execute()
}
