import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../domain/value-objects/master-data-definition.js'
import { columnSqlType } from '../../infrastructure/persistence/master-record.repository.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export const masterDataIdentityMigrationContract = {
  primaryKeyColumn: 'id',
  primaryKeyDefinition: 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY',
  publicUuidColumn: 'uuid',
  publicUuidDefinition: 'CHAR(8) NOT NULL UNIQUE',
  publicUuidLength: 8,
} as const

export async function migrateMasterRecordDefinitions(
  database: TenantDatabase,
  definitions: readonly MasterDataModuleDefinition[],
) {
  for (const definition of definitions) {
    await migrateMasterRecordDefinition(database, definition)
  }
}

export async function migrateMasterRecordDefinition(
  database: TenantDatabase,
  definition: MasterDataModuleDefinition,
) {
  const columns = definition.columns.map((column) => {
    const nullable = column.required || column.nullable === false ? 'NOT NULL' : 'NULL'
    const defaultValue = defaultSql(column)
    return `\`${column.key}\` ${columnSqlType(column)} ${nullable}${defaultValue}`
  })

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS \`${definition.tableName}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      ${columns.join(',\n      ')},
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uk_${definition.tableName}_uuid (uuid),
      INDEX idx_${definition.tableName}_${definition.defaultSortKey} (${definition.defaultSortKey})
    )
  `).execute(database)

  await ensureUuidColumn(database, definition.tableName)
  await ensureDefinitionColumns(database, definition)
  await relaxRemovedDefinitionColumns(database, definition)
}

export { migrateMasterRecordDefinition as migrateMasterDataDefinition }

function defaultSql(column: MasterDataColumnDefinition) {
  if (column.type === 'boolean') return ' DEFAULT 0'
  if (column.type === 'number' && !column.required) return ' DEFAULT NULL'
  return ''
}

async function ensureUuidColumn(database: TenantDatabase, tableName: string) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = 'uuid'
  `.execute(database)

  if (existing.rows.length === 0) {
    await sql.raw(`ALTER TABLE \`${tableName}\` ADD COLUMN \`uuid\` CHAR(8) NULL AFTER \`id\``).execute(database)
  }

  await sql.raw(`
    UPDATE \`${tableName}\`
    SET uuid = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8))
    WHERE uuid IS NULL OR uuid = ''
  `).execute(database)

  try {
    await sql.raw(`ALTER TABLE \`${tableName}\` MODIFY \`uuid\` CHAR(8) NOT NULL`).execute(database)
    await sql.raw(`ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`uk_${tableName}_uuid\` (\`uuid\`)`).execute(database)
  } catch {
    // Existing tenant databases may already have the unique uuid index.
  }
}

async function ensureDefinitionColumns(database: TenantDatabase, definition: MasterDataModuleDefinition) {
  const existingColumns = await listTableColumns(database, definition.tableName)
  const existingColumnNames = new Set(existingColumns.map((column) => column.COLUMN_NAME))

  for (const column of definition.columns) {
    if (existingColumnNames.has(column.key)) continue

    await sql.raw(
      `ALTER TABLE \`${definition.tableName}\` ADD COLUMN \`${column.key}\` ${columnSqlType(column)} NULL`,
    ).execute(database)

    existingColumnNames.add(column.key)

    if (column.key === 'name') {
      await backfillNameColumn(database, definition.tableName, existingColumns)
    }
  }
}

async function backfillNameColumn(
  database: TenantDatabase,
  tableName: string,
  existingColumns: { COLUMN_NAME: string }[],
) {
  const fallbackColumn = existingColumns.find((column) =>
    ['code', 'pincode', 'city', 'district', 'title', 'label'].includes(column.COLUMN_NAME),
  )

  const fallbackSql = fallbackColumn
    ? `NULLIF(TRIM(\`${fallbackColumn.COLUMN_NAME}\`), '')`
    : `CONCAT('Record ', \`id\`)`

  await sql.raw(`
    UPDATE \`${tableName}\`
    SET \`name\` = COALESCE(${fallbackSql}, \`uuid\`, CONCAT('Record ', \`id\`))
    WHERE \`name\` IS NULL OR \`name\` = ''
  `).execute(database)
}

async function relaxRemovedDefinitionColumns(database: TenantDatabase, definition: MasterDataModuleDefinition) {
  const activeColumnKeys = new Set([
    'id',
    'uuid',
    'is_active',
    'created_at',
    'updated_at',
    'deleted_at',
    ...definition.columns.map((column) => column.key),
  ])
  const existingColumns = await listTableColumns(database, definition.tableName)

  for (const column of existingColumns) {
    if (activeColumnKeys.has(column.COLUMN_NAME) || column.IS_NULLABLE === 'YES') continue

    await sql.raw(`ALTER TABLE \`${definition.tableName}\` MODIFY \`${column.COLUMN_NAME}\` ${column.COLUMN_TYPE} NULL`).execute(database)
  }
}

function listTableColumns(database: TenantDatabase, tableName: string) {
  return sql<{ COLUMN_NAME: string; COLUMN_TYPE: string; IS_NULLABLE: string }>`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
  `.execute(database).then((result) => result.rows)
}
