import { sql } from 'kysely'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { BadRequestException, NotFoundException } from '../../../server/src/core/exceptions/http.exception.js'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import { getDatabase } from '../../../server/src/infrastructure/database/connection.js'
import { dbConfig } from '../../../server/src/framework/config/index.js'

export type MirrorStatus = {
  enabled: boolean
  jobCount: number
  cursorCount: number
  lastJobStatus: string | null
  mode: 'foundation-ready'
  nextStep: string
}
export type MirrorFullDumpJob = {
  completedAt: string | null
  database: string
  downloadPath: string | null
  error: string | null
  id: string
  progress: number
  rowCount: number
  rows: Record<string, number>
  sha256: string | null
  sizeBytes: number
  startedAt: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  tableCount: number
  tenantCode: string
  tenantName: string
}
export type MirrorIncrementalPull = {
  coverage: { deletePropagation: 'enabled' | 'missing-tombstone-outbox'; eligible: number; skipped: Array<{ reason: string; table: string }> }
  database: string
  deletes: Array<{ deletedAt: string; primaryKey: string; primaryKeyValue: string; table: string }>
  deleteCursor: string | null
  hasMore: boolean
  tables: Array<{ columns: string[]; nextCursor: string | null; primaryKey: string; rows: Array<Record<string, unknown>>; table: string; updatedColumn: string }>
  tenantCode: string
}
type TenantRow = { code: number | string; corporate_id: string | null; db_host: string; db_name: string; db_port: number; db_secret_ref: string; db_user: string; id: number; name: string; slug: string }

@Injectable()
export class MirrorService {
  private readonly fullDumpJobs = new Map<string, MirrorFullDumpJob & { filePath?: string }>()
  private readonly mirrorRoot = resolve(process.cwd(), 'storage', 'cxsync', 'mirror', 'full')

  async status(): Promise<MirrorStatus> {
    await ensureMirrorTables()
    const database = getDatabase()
    const jobs = await sql<{ count: string | number }>`SELECT COUNT(*) AS count FROM cxsync_mirror_jobs`.execute(database)
    const cursors = await sql<{ count: string | number }>`SELECT COUNT(*) AS count FROM cxsync_mirror_cursors`.execute(database)
    const latest = await sql<{ status: string }>`SELECT status FROM cxsync_mirror_jobs ORDER BY created_at DESC LIMIT 1`.execute(database)
    return {
      cursorCount: Number(cursors.rows[0]?.count ?? 0),
      enabled: false,
      jobCount: Number(jobs.rows[0]?.count ?? 0),
      lastJobStatus: latest.rows[0]?.status ?? null,
      mode: 'foundation-ready',
      nextStep: 'Manual incremental pull is available for eligible tables with single primary key and updated_at; daily incremental scheduling and delete tracking are next.',
    }
  }

  async startFullDump(input: { corporateId?: string; tenantCode?: string }): Promise<MirrorFullDumpJob> {
    await ensureMirrorTables()
    const tenant = await this.findTenant(input)
    const password = dbConfig.tenant.password(tenant.db_secret_ref)
    if (!password) throw new BadRequestException(`Tenant database credential ${tenant.db_secret_ref} is unavailable on CXSync Cloud.`)
    const job: MirrorFullDumpJob & { filePath?: string } = {
      completedAt: null,
      database: tenant.db_name,
      downloadPath: null,
      error: null,
      id: randomUUID(),
      progress: 1,
      rowCount: 0,
      rows: {},
      sha256: null,
      sizeBytes: 0,
      startedAt: new Date().toISOString(),
      status: 'running',
      tableCount: 0,
      tenantCode: String(tenant.code),
      tenantName: tenant.name,
    }
    this.fullDumpJobs.set(job.id, job)
    await saveCloudMirrorJob(job, tenant, 'running', null)
    void this.executeFullDump(job, tenant, password)
    return publicJob(job)
  }

  fullDumpJob(id: string): MirrorFullDumpJob {
    const job = this.fullDumpJobs.get(id)
    if (!job) throw new NotFoundException('Mirror full-sync dump job was not found or CXSync Cloud restarted.')
    return publicJob(job)
  }

  fullDumpPath(id: string): string {
    const job = this.fullDumpJobs.get(id)
    if (!job || job.status !== 'completed' || !job.filePath) throw new NotFoundException('Mirror full-sync dump is not ready for download.')
    return job.filePath
  }

  async incrementalPull(input: { corporateId?: string; cursors?: Record<string, string | null>; limit?: number; tenantCode?: string }): Promise<MirrorIncrementalPull> {
    const tenant = await this.findTenant(input)
    const password = dbConfig.tenant.password(tenant.db_secret_ref)
    if (!password) throw new BadRequestException(`Tenant database credential ${tenant.db_secret_ref} is unavailable on CXSync Cloud.`)
    const limit = Math.max(1, Math.min(5000, Number(input.limit || 1000)))
    const connection = await mysql.createConnection({ connectTimeout: 15_000, host: tenant.db_host, password, port: tenant.db_port, user: tenant.db_user })
    try {
      const coverage = await tableCoverage(connection, tenant.db_name)
      const eligible = coverage.eligible
      const tables = []
      let hasMore = false
      const deleteCursor = input.cursors?.__cxsync_mirror_tombstones || '1970-01-01 00:00:00.000'
      const deletes = await tombstoneDeletes(connection, tenant.db_name, deleteCursor, limit)
      if (deletes.rows.length >= limit) hasMore = true
      for (const table of eligible) {
        const cursor = input.cursors?.[table.table] || '1970-01-01 00:00:00.000'
        const [rows] = await connection.query<RowDataPacket[]>(
          `SELECT * FROM \`${tenant.db_name}\`.\`${table.table.replaceAll('`', '``')}\` WHERE \`${table.updatedColumn}\` > ? ORDER BY \`${table.updatedColumn}\`, \`${table.primaryKey}\` LIMIT ?`,
          [cursor, limit],
        )
        if (rows.length >= limit) hasMore = true
        const serialRows = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString().slice(0, 23).replace('T', ' ') : value])))
        const nextCursor = serialRows.reduce<string | null>((latest, row) => {
          const value = row[table.updatedColumn]
          return typeof value === 'string' && (!latest || value > latest) ? value : latest
        }, null)
        tables.push({ ...table, nextCursor, rows: serialRows })
      }
      return {
        coverage: { deletePropagation: deletes.enabled ? 'enabled' : 'missing-tombstone-outbox', eligible: eligible.length, skipped: coverage.skipped },
        database: tenant.db_name,
        deleteCursor: deletes.nextCursor,
        deletes: deletes.rows,
        hasMore,
        tables,
        tenantCode: String(tenant.code),
      }
    } finally {
      await connection.end().catch(() => undefined)
    }
  }

  private async findTenant(input: { corporateId?: string; tenantCode?: string }) {
    const tenantCode = input?.tenantCode?.trim()
    const corporateId = input?.corporateId?.trim()
    if (!tenantCode && !corporateId) throw new BadRequestException('tenantCode or corporateId is required for Mirror full sync.')
    const database = getDatabase()
    const row = tenantCode
      ? await database.selectFrom('tenants').selectAll().where('code', '=', Number(tenantCode)).where('status', '=', 'active').where('deleted_at', 'is', null).executeTakeFirst()
      : await database.selectFrom('tenants').selectAll().where('corporate_id', '=', corporateId!).where('status', '=', 'active').where('deleted_at', 'is', null).executeTakeFirst()
    if (!row) throw new NotFoundException('Active cloud tenant was not found for Mirror full sync.')
    return row as TenantRow
  }

  private async executeFullDump(job: MirrorFullDumpJob & { filePath?: string }, tenant: TenantRow, password: string) {
    const directory = resolve(this.mirrorRoot, safeSegment(job.id))
    const filePath = resolve(directory, `${safeSegment(tenant.db_name)}.sql`)
    try {
      await mkdir(directory, { recursive: true })
      const evidence = await databaseEvidence(tenant, password)
      job.tableCount = evidence.tableCount
      job.rowCount = sumRows(evidence.rows)
      job.rows = evidence.rows
      await runDump(process.env.CXSYNC_FLEET_DUMP_PATH?.trim() || process.env.CXSYNC_MARIADB_DUMP_PATH?.trim() || 'mariadb-dump', filePath, tenant, password, (written) => {
        job.sizeBytes = written
        job.progress = Math.min(95, Math.max(2, Math.round((written / Math.max(1, evidence.sizeBytes)) * 90)))
      })
      const file = await stat(filePath)
      if (!file.size) throw new Error('Mirror full-sync dump is empty.')
      job.filePath = filePath
      job.completedAt = new Date().toISOString()
      job.downloadPath = `/api/v1/cxsync-cloud/mirror/full-dumps/${job.id}/download`
      job.progress = 100
      job.sha256 = await hashFile(filePath)
      job.sizeBytes = file.size
      job.status = 'completed'
      await saveCloudMirrorJob(job, tenant, 'completed', null)
    } catch (reason) {
      job.completedAt = new Date().toISOString()
      job.error = reason instanceof Error ? reason.message : 'Mirror full-sync dump failed.'
      job.progress = 100
      job.status = 'failed'
      await saveCloudMirrorJob(job, tenant, 'failed', job.error)
    }
  }
}

async function tombstoneDeletes(connection: mysql.Connection, database: string, cursor: string, limit: number) {
  const [exists] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cxsync_mirror_tombstones' AND TABLE_TYPE = 'BASE TABLE' LIMIT 1`,
    [database],
  )
  if (!exists.length) return { enabled: false, nextCursor: null, rows: [] as Array<{ deletedAt: string; primaryKey: string; primaryKeyValue: string; table: string }> }
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT table_name, primary_key, primary_key_value, deleted_at
     FROM \`${database}\`.\`cxsync_mirror_tombstones\`
     WHERE deleted_at > ?
     ORDER BY deleted_at, table_name, primary_key_value
     LIMIT ?`,
    [cursor, limit],
  )
  const serialRows = rows.map((row) => ({
    deletedAt: row.deleted_at instanceof Date ? row.deleted_at.toISOString().slice(0, 23).replace('T', ' ') : String(row.deleted_at),
    primaryKey: String(row.primary_key),
    primaryKeyValue: String(row.primary_key_value),
    table: String(row.table_name),
  }))
  const nextCursor = serialRows.reduce<string | null>((latest, row) => (!latest || row.deletedAt > latest ? row.deletedAt : latest), null)
  return { enabled: true, nextCursor, rows: serialRows }
}

async function tableCoverage(connection: mysql.Connection, database: string) {
  const [baseTables] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    [database],
  )
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT c.TABLE_NAME, GROUP_CONCAT(c.COLUMN_NAME ORDER BY c.ORDINAL_POSITION) AS COLUMNS,
            MAX(pk.COLUMN_NAME) AS PRIMARY_KEY, upd.COLUMN_NAME AS UPDATED_COLUMN
     FROM information_schema.COLUMNS c
     JOIN information_schema.COLUMNS upd ON upd.TABLE_SCHEMA = c.TABLE_SCHEMA AND upd.TABLE_NAME = c.TABLE_NAME AND upd.COLUMN_NAME = 'updated_at'
     JOIN information_schema.KEY_COLUMN_USAGE pk ON pk.TABLE_SCHEMA = c.TABLE_SCHEMA AND pk.TABLE_NAME = c.TABLE_NAME AND pk.CONSTRAINT_NAME = 'PRIMARY'
     JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
     WHERE c.TABLE_SCHEMA = ?
     GROUP BY c.TABLE_NAME, upd.COLUMN_NAME
     HAVING COUNT(DISTINCT pk.COLUMN_NAME) = 1
     ORDER BY c.TABLE_NAME`,
    [database],
  )
  const eligible = rows.map((row) => ({ columns: String(row.COLUMNS).split(','), primaryKey: String(row.PRIMARY_KEY), table: String(row.TABLE_NAME), updatedColumn: String(row.UPDATED_COLUMN) }))
  const eligibleNames = new Set(eligible.map((table) => table.table))
  const skipped = []
  for (const table of baseTables) {
    const name = String(table.TABLE_NAME)
    if (eligibleNames.has(name)) continue
    const [details] = await connection.execute<RowDataPacket[]>(
      `SELECT
         SUM(COLUMN_NAME = 'updated_at') AS HAS_UPDATED_AT,
         (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY') AS PRIMARY_COUNT
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, name, database, name],
    )
    const hasUpdatedAt = Number(details[0]?.HAS_UPDATED_AT ?? 0) > 0
    const primaryCount = Number(details[0]?.PRIMARY_COUNT ?? 0)
    skipped.push({ reason: !hasUpdatedAt ? 'missing-updated_at' : primaryCount !== 1 ? 'primary-key-not-single-column' : 'not-eligible', table: name })
  }
  return { eligible, skipped }
}

let mirrorTablesReady = false
async function ensureMirrorTables() {
  if (mirrorTablesReady) return
  const database = getDatabase()
  await sql`
    CREATE TABLE IF NOT EXISTS cxsync_mirror_jobs (
      id CHAR(36) PRIMARY KEY,
      tenant_id INT NOT NULL,
      tenant_code VARCHAR(80) NOT NULL,
      tenant_slug VARCHAR(120) NOT NULL,
      tenant_name VARCHAR(191) NOT NULL,
      source_database VARCHAR(191) NOT NULL,
      target_database VARCHAR(191) NOT NULL,
      direction VARCHAR(40) NOT NULL,
      mode VARCHAR(40) NOT NULL,
      schedule_cron VARCHAR(120) NULL,
      status VARCHAR(40) NOT NULL,
      last_started_at DATETIME(3) NULL,
      last_completed_at DATETIME(3) NULL,
      last_error TEXT NULL,
      evidence_json LONGTEXT NULL,
      expires_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      KEY idx_cxsync_mirror_jobs_tenant (tenant_id, status, created_at),
      KEY idx_cxsync_mirror_jobs_status (status, created_at)
    ) ENGINE=InnoDB
  `.execute(database)
  await sql`ALTER TABLE cxsync_mirror_jobs ADD COLUMN IF NOT EXISTS evidence_json LONGTEXT NULL AFTER last_error`.execute(database)
  await sql`ALTER TABLE cxsync_mirror_jobs ADD COLUMN IF NOT EXISTS expires_at DATETIME(3) NULL AFTER evidence_json`.execute(database)
  await sql`
    CREATE TABLE IF NOT EXISTS cxsync_mirror_cursors (
      id CHAR(36) PRIMARY KEY,
      mirror_job_id CHAR(36) NOT NULL,
      tenant_id INT NOT NULL,
      source_database VARCHAR(191) NOT NULL,
      target_database VARCHAR(191) NOT NULL,
      cursor_type VARCHAR(40) NOT NULL,
      cursor_value VARCHAR(500) NULL,
      high_watermark_json LONGTEXT NULL,
      verified_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY uq_cxsync_mirror_cursor_source (mirror_job_id, source_database, cursor_type),
      KEY idx_cxsync_mirror_cursors_tenant (tenant_id, updated_at)
    ) ENGINE=InnoDB
  `.execute(database)
  mirrorTablesReady = true
}

async function saveCloudMirrorJob(job: MirrorFullDumpJob, tenant: TenantRow, status: string, error: string | null) {
  const now = sqlDate(new Date())
  const expiresAt = sqlDate(new Date(Date.now() + Number(process.env.CXSYNC_MIRROR_FULL_DUMP_RETENTION_HOURS || 72) * 60 * 60 * 1000))
  await sql`
    INSERT INTO cxsync_mirror_jobs
      (id, tenant_id, tenant_code, tenant_slug, tenant_name, source_database, target_database, direction, mode, schedule_cron, status, last_started_at, last_completed_at, last_error, evidence_json, expires_at, created_at, updated_at)
    VALUES
      (${job.id}, ${tenant.id}, ${String(tenant.code)}, ${tenant.slug}, ${tenant.name}, ${tenant.db_name}, ${job.database}, 'cloud-to-local', 'full-dump', NULL, ${status}, ${sqlDate(new Date(job.startedAt))}, ${job.completedAt ? sqlDate(new Date(job.completedAt)) : null}, ${error}, ${JSON.stringify({ rowCount: job.rowCount, rows: job.rows, sha256: job.sha256, sizeBytes: job.sizeBytes, tableCount: job.tableCount })}, ${expiresAt}, ${now}, ${now})
    ON DUPLICATE KEY UPDATE status = ${status}, last_completed_at = ${job.completedAt ? sqlDate(new Date(job.completedAt)) : null}, last_error = ${error}, evidence_json = ${JSON.stringify({ rowCount: job.rowCount, rows: job.rows, sha256: job.sha256, sizeBytes: job.sizeBytes, tableCount: job.tableCount })}, expires_at = ${expiresAt}, updated_at = ${now}
  `.execute(getDatabase())
}

function publicJob(job: MirrorFullDumpJob & { filePath?: string }): MirrorFullDumpJob {
  const { filePath: _filePath, ...safe } = job
  return { ...safe }
}

async function databaseEvidence(tenant: TenantRow, password: string) {
  const connection = await mysql.createConnection({ connectTimeout: 15_000, host: tenant.db_host, password, port: tenant.db_port, user: tenant.db_user })
  try {
    const [tables] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME, COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) AS SIZE_BYTES
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      [tenant.db_name],
    )
    const rows: Record<string, number> = {}
    let sizeBytes = 0
    for (const table of tables) {
      const name = String(table.TABLE_NAME)
      sizeBytes += Number(table.SIZE_BYTES ?? 0)
      const [countRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM \`${tenant.db_name}\`.\`${name.replaceAll('`', '``')}\``)
      rows[name] = Number(countRows[0]?.count ?? 0)
    }
    return { rows, sizeBytes, tableCount: tables.length }
  } finally {
    await connection.end().catch(() => undefined)
  }
}

async function runDump(tool: string, path: string, tenant: TenantRow, password: string, onProgress: (written: number) => void) {
  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(path, { flags: 'wx' })
    const child = spawn(tool, [
      `--host=${tenant.db_host}`, `--port=${tenant.db_port}`, `--user=${tenant.db_user}`,
      '--single-transaction', '--quick', '--routines', '--triggers', '--events', '--hex-blob', '--default-character-set=utf8mb4', tenant.db_name,
    ], { env: { ...process.env, MYSQL_PWD: password }, stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    let written = 0
    child.stdout.on('data', (chunk: Buffer) => {
      written += chunk.length
      onProgress(written)
    })
    child.stdout.pipe(output)
    child.stderr.on('data', (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on('error', reject)
    output.on('error', reject)
    child.on('close', (code) => output.end(() => code === 0 ? resolvePromise() : reject(new Error(`Mirror dump failed: ${stderr.trim() || `exit ${code}`}`))))
  })
}

async function hashFile(path: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function sumRows(rows: Record<string, number>) {
  return Object.values(rows).reduce((sum, count) => sum + count, 0)
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_') || 'mirror'
}
function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace('T', ' ')
}
