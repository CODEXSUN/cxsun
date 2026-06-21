import { Kysely, MysqlDialect } from 'kysely'
import { createPool, type PoolOptions } from 'mysql2'
import type { RowDataPacket } from 'mysql2'
import { createConnection } from 'mysql2/promise'
import { dbConfig } from '../../../../framework/config/index.js'
import { tirupurConnectDatabaseModule } from './tirupur-connect.database.js'
import type { TirupurConnectDatabaseSchema, TirupurConnectTableName } from './tirupur-connect.schema.js'

let database: Kysely<TirupurConnectDatabaseSchema> | null = null

const tablesInDependencyOrder: TirupurConnectTableName[] = [
  'tc_accounts',
  'tc_categories',
  'tc_companies',
  'tc_company_categories',
  'tc_products',
  'tc_submissions',
  'tc_submission_revisions',
  'tc_sync_requests',
  'tc_rfqs',
  'tc_rfq_quotes',
  'tc_inquiries',
  'tc_verification_requests',
  'tc_membership_plans',
  'tc_memberships',
  'tc_payments',
  'tc_content',
  'tc_frontend_releases',
  'tc_frontend_pages',
  'tc_frontend_sections',
  'tc_frontend_section_items',
  'tc_audit_logs',
  'tc_settings',
]

export function getTirupurConnectDatabase() {
  if (database) return database
  database = new Kysely<TirupurConnectDatabaseSchema>({
    dialect: new MysqlDialect({
      pool: createPool({
        ...dbConfig.tirupurConnect,
        timezone: 'Z',
      } satisfies PoolOptions),
    }),
  })
  return database
}

export async function initializeTirupurConnectDatabase() {
  const migration = await migrateTirupurConnectDatabase()
  await seedTirupurConnectDatabase()
  if (migration.migratedTables.length) {
    console.log(`  ok Tirupur Connect database migrated: ${migration.migratedTables.join(', ')}`)
  }
}

export async function migrateTirupurConnectDatabase() {
  await ensureDatabase()
  await tirupurConnectDatabaseModule.migrate(getTirupurConnectDatabase())
  return migrateMasterTables()
}

export async function seedTirupurConnectDatabase() {
  await ensureDatabase()
  await tirupurConnectDatabaseModule.seed(getTirupurConnectDatabase())
}

export async function closeTirupurConnectDatabase() {
  if (!database) return
  await database.destroy()
  database = null
}

export async function dropTirupurConnectDatabase() {
  await closeTirupurConnectDatabase()
  const config = dbConfig.tirupurConnect
  const connection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await connection.query(`DROP DATABASE IF EXISTS \`${safeName(config.database)}\``)
  await connection.end()
}

async function ensureDatabase() {
  const config = dbConfig.tirupurConnect
  const connection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${safeName(config.database)}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.end()
}

async function migrateMasterTables() {
  const sourceConfig = dbConfig.master
  const targetConfig = dbConfig.tirupurConnect
  if (!sameServer(sourceConfig, targetConfig)) {
    throw new Error('Automatic Tirupur Connect migration requires master and product databases on the same MariaDB server.')
  }
  if (sourceConfig.database === targetConfig.database) {
    throw new Error('Tirupur Connect database must be different from the master database.')
  }

  const connection = await createConnection({
    host: targetConfig.host,
    port: targetConfig.port,
    user: targetConfig.user,
    password: targetConfig.password,
    timezone: 'Z',
    multipleStatements: false,
  })
  const source = safeName(sourceConfig.database)
  const target = safeName(targetConfig.database)
  const migratedTables: TirupurConnectTableName[] = []

  try {
    const existing = await existingSourceTables(connection, source)
    if (!existing.length) return { migratedTables }

    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of tablesInDependencyOrder.filter((name) => existing.includes(name))) {
      const columns = await sharedColumns(connection, source, target, table)
      if (!columns.length) throw new Error(`No shared columns found while migrating ${table}.`)
      const columnList = columns.map((column) => `\`${column}\``).join(', ')
      await connection.query(
        `INSERT IGNORE INTO \`${target}\`.\`${table}\` (${columnList}) SELECT ${columnList} FROM \`${source}\`.\`${table}\``,
      )
      migratedTables.push(table)
    }

    for (const table of migratedTables) {
      const sourceCount = await tableCount(connection, source, table)
      const targetCount = await tableCount(connection, target, table)
      if (targetCount < sourceCount) {
        throw new Error(`Tirupur Connect migration verification failed for ${table}: source=${sourceCount}, target=${targetCount}.`)
      }
    }

    for (const table of [...migratedTables].reverse()) {
      await connection.query(`DROP TABLE \`${source}\`.\`${table}\``)
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
    return { migratedTables }
  } catch (error) {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined)
    throw error
  } finally {
    await connection.end()
  }
}

async function sharedColumns(
  connection: Awaited<ReturnType<typeof createConnection>>,
  sourceDatabase: string,
  targetDatabase: string,
  table: TirupurConnectTableName,
) {
  const [rows] = await connection.query<ColumnRow[]>(
    `SELECT TABLE_SCHEMA, COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_NAME = ? AND TABLE_SCHEMA IN (?, ?)
     ORDER BY ORDINAL_POSITION`,
    [table, sourceDatabase, targetDatabase],
  )
  const sourceColumns = new Set(rows.filter((row) => row.TABLE_SCHEMA === sourceDatabase).map((row) => row.COLUMN_NAME))
  return rows
    .filter((row) => row.TABLE_SCHEMA === targetDatabase && sourceColumns.has(row.COLUMN_NAME))
    .map((row) => row.COLUMN_NAME)
}

async function existingSourceTables(connection: Awaited<ReturnType<typeof createConnection>>, databaseName: string) {
  const [rows] = await connection.query<TableNameRow[]>(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE ?',
    [databaseName, 'tc\\_%'],
  )
  const known = new Set(tablesInDependencyOrder)
  return rows.map((row) => row.TABLE_NAME).filter((name): name is TirupurConnectTableName => known.has(name as TirupurConnectTableName))
}

async function tableCount(
  connection: Awaited<ReturnType<typeof createConnection>>,
  databaseName: string,
  table: TirupurConnectTableName,
) {
  const [rows] = await connection.query<TableCountRow[]>(`SELECT COUNT(*) AS total FROM \`${databaseName}\`.\`${table}\``)
  return Number(rows[0]?.total ?? 0)
}

interface TableNameRow extends RowDataPacket {
  TABLE_NAME: string
}

interface TableCountRow extends RowDataPacket {
  total: number
}

interface ColumnRow extends RowDataPacket {
  TABLE_SCHEMA: string
  COLUMN_NAME: string
}

function sameServer(left: { host: string; port: number }, right: { host: string; port: number }) {
  return left.host === right.host && left.port === right.port
}

function safeName(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error(`Unsafe database name: ${value}`)
  return value
}
