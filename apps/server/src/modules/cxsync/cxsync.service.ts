import { createHash, randomUUID } from 'node:crypto'
import { sql } from 'kysely'
import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import type { CxSyncTenantColumnSnapshot, CxSyncTenantIndexSnapshot, CxSyncTenantSnapshot, CxSyncTenantTableSnapshot } from './cxsync.types.js'

@Injectable()
export class CxSyncService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
  ) {}

  async tenantSnapshot(headers: TenantRequestHeaders): Promise<{ ok: true; snapshot: CxSyncTenantSnapshot }> {
    const context = await this.tenants.resolve(headers)
    const databaseName = context.tenant.db_name
    const [tablesResult, columnsResult, indexesResult] = await Promise.all([
      sql<CxSyncTenantTableSnapshot>`
        SELECT
          TABLE_NAME AS tableName,
          COALESCE(ENGINE, '') AS engine,
          COALESCE(TABLE_COLLATION, '') AS collation,
          COALESCE(TABLE_ROWS, 0) AS rowsEstimate,
          COALESCE(DATA_LENGTH, 0) AS dataLength,
          COALESCE(INDEX_LENGTH, 0) AS indexLength,
          UPDATE_TIME AS updatedAt,
          (
            SELECT COUNT(*)
            FROM information_schema.COLUMNS c
            WHERE c.TABLE_SCHEMA = information_schema.TABLES.TABLE_SCHEMA
              AND c.TABLE_NAME = information_schema.TABLES.TABLE_NAME
          ) AS columnCount,
          (
            SELECT COUNT(DISTINCT s.INDEX_NAME)
            FROM information_schema.STATISTICS s
            WHERE s.TABLE_SCHEMA = information_schema.TABLES.TABLE_SCHEMA
              AND s.TABLE_NAME = information_schema.TABLES.TABLE_NAME
          ) AS indexCount,
          EXISTS (
            SELECT 1
            FROM information_schema.STATISTICS pk
            WHERE pk.TABLE_SCHEMA = information_schema.TABLES.TABLE_SCHEMA
              AND pk.TABLE_NAME = information_schema.TABLES.TABLE_NAME
              AND pk.INDEX_NAME = 'PRIMARY'
          ) AS hasPrimaryKey
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ${databaseName}
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `.execute(context.database),
      sql<CxSyncTenantColumnSnapshot>`
        SELECT
          TABLE_NAME AS tableName,
          COLUMN_NAME AS columnName,
          ORDINAL_POSITION AS ordinalPosition,
          COLUMN_TYPE AS columnType,
          IS_NULLABLE AS isNullable,
          COLUMN_DEFAULT AS columnDefault,
          EXTRA AS extra
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ${databaseName}
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `.execute(context.database),
      sql<CxSyncTenantIndexSnapshot>`
        SELECT
          TABLE_NAME AS tableName,
          INDEX_NAME AS indexName,
          COLUMN_NAME AS columnName,
          NON_UNIQUE AS isUnique,
          SEQ_IN_INDEX AS sequence
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ${databaseName}
        ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
      `.execute(context.database),
    ])

    const tables = tablesResult.rows.map(normalizeTable)
    const columns = columnsResult.rows.map(normalizeColumn)
    const indexes = indexesResult.rows.map(normalizeIndex)
    const totals = {
      columnCount: columns.length,
      dataLength: tables.reduce((sum, table) => sum + table.dataLength, 0),
      indexCount: indexes.length,
      indexLength: tables.reduce((sum, table) => sum + table.indexLength, 0),
      missingPrimaryKeyCount: tables.filter((table) => !table.hasPrimaryKey).length,
      rowsEstimate: tables.reduce((sum, table) => sum + table.rowsEstimate, 0),
      tableCount: tables.length,
    }
    const schemaHash = createHash('sha256').update(JSON.stringify({ columns, indexes, tables })).digest('hex')

    return {
      ok: true,
      snapshot: {
        capturedAt: new Date().toISOString(),
        columns,
        database: databaseName,
        indexes,
        schemaHash,
        tables,
        tenant: {
          code: Number(context.tenant.code),
          corporateId: context.tenant.corporate_id,
          name: context.tenant.name,
          slug: context.tenant.slug,
        },
        totals,
      },
    }
  }

  async report(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenants.resolve(headers)
    const reportId = randomUUID()
    await ensureReportTable()
    await getDatabase().executeQuery(sql`
      INSERT INTO cxsync_cloud_reports
        (id, tenant_id, tenant_slug, job_id, summary_json, report_json, received_at)
      VALUES
        (${reportId}, ${context.tenant.id}, ${context.tenant.slug}, ${String(input.jobId ?? '')}, ${JSON.stringify(input.summary ?? null)}, ${JSON.stringify(input)}, ${new Date().toISOString().slice(0, 19).replace('T', ' ')})
    `.compile(getDatabase()))
    console.log(JSON.stringify({
      at: new Date().toISOString(),
      reportId,
      service: 'cxsync-cloud',
      tenant: context.tenant.slug,
      type: 'sync-report',
      summary: input.summary ?? null,
    }))
    return {
      ok: true,
      receivedAt: new Date().toISOString(),
      reportId,
      tenant: context.tenant.slug,
    }
  }
}

async function ensureReportTable() {
  await getDatabase().executeQuery(sql`
    CREATE TABLE IF NOT EXISTS cxsync_cloud_reports (
      id CHAR(36) PRIMARY KEY,
      tenant_id INT NOT NULL,
      tenant_slug VARCHAR(120) NOT NULL,
      job_id CHAR(36) NOT NULL,
      summary_json LONGTEXT NULL,
      report_json LONGTEXT NOT NULL,
      received_at DATETIME(3) NOT NULL,
      KEY idx_cxsync_cloud_reports_tenant (tenant_id, received_at),
      KEY idx_cxsync_cloud_reports_job (job_id)
    ) ENGINE=InnoDB
  `.compile(getDatabase()))
}

function normalizeTable(row: CxSyncTenantTableSnapshot): CxSyncTenantTableSnapshot {
  return {
    collation: String(row.collation ?? ''),
    columnCount: Number(row.columnCount ?? 0),
    dataLength: Number(row.dataLength ?? 0),
    engine: String(row.engine ?? ''),
    hasPrimaryKey: Boolean(row.hasPrimaryKey),
    indexCount: Number(row.indexCount ?? 0),
    indexLength: Number(row.indexLength ?? 0),
    rowsEstimate: Number(row.rowsEstimate ?? 0),
    tableName: String(row.tableName ?? ''),
    updatedAt: isoDateOrNull(row.updatedAt),
  }
}

function normalizeColumn(row: CxSyncTenantColumnSnapshot): CxSyncTenantColumnSnapshot {
  return {
    columnDefault: row.columnDefault == null ? null : String(row.columnDefault),
    columnName: String(row.columnName ?? ''),
    columnType: String(row.columnType ?? ''),
    extra: String(row.extra ?? ''),
    isNullable: String(row.isNullable ?? '').toUpperCase() === 'YES',
    ordinalPosition: Number(row.ordinalPosition ?? 0),
    tableName: String(row.tableName ?? ''),
  }
}

function normalizeIndex(row: CxSyncTenantIndexSnapshot): CxSyncTenantIndexSnapshot {
  return {
    columnName: String(row.columnName ?? ''),
    indexName: String(row.indexName ?? ''),
    isUnique: Number(row.isUnique ?? 1) === 0,
    sequence: Number(row.sequence ?? 0),
    tableName: String(row.tableName ?? ''),
  }
}

function isoDateOrNull(value: unknown) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value)
  if (!text || text === '0000-00-00 00:00:00') return null
  return text.includes('T') ? text : `${text.replace(' ', 'T')}Z`
}
