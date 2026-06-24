import { app } from "electron"
import { randomUUID } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { Readable } from "node:stream"
import { spawn } from "node:child_process"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { MirrorFullSyncJob, MirrorFullSyncQueue, MirrorIncrementalSyncJob, MirrorIncrementalSyncQueue, MirrorSchedule } from "../../src/shared/connection-contracts.js"
import { cxSyncCloudHeaders } from "./cxsync-cloud-client.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { getServiceKeyStatus } from "./environment.js"
import { findClientTool, findDumpTool } from "./tenant-backup-manager.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"

const jobs = new Map<string, MirrorFullSyncJob>()
const incrementalJobs = new Map<string, MirrorIncrementalSyncJob>()
const queues = new Map<string, { id: string; itemIds: string[]; running: boolean; startedAt: string; stopped?: boolean; totalCount: number }>()
const incrementalQueues = new Map<string, { id: string; itemIds: string[]; paused?: boolean; running: boolean; startedAt: string; stopped?: boolean; totalCount: number }>()
let schedulerTimer: NodeJS.Timeout | null = null

export async function startMirrorFullSync(id: string, targetDatabase?: string): Promise<MirrorFullSyncJob> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const status = await getServiceKeyStatus()
  const baseUrl = status.cloudServiceUrl?.replace(/\/+$/, "")
  if (!baseUrl) throw new Error("Configure the CXSync Cloud service URL before Mirror full sync.")
  const dumpTool = await findDumpTool()
  if (!dumpTool) throw new Error("MariaDB dump utility was not found. Install MariaDB/MySQL client tools or set CXSYNC_MARIADB_DUMP_PATH.")
  const clientTool = await findClientTool(dumpTool)
  if (!clientTool) throw new Error("MariaDB client utility was not found. Install MariaDB/MySQL client tools or set CXSYNC_MARIADB_CLIENT_PATH.")

  const mirrorDatabase = normalizeDatabaseName(targetDatabase || `cxmirror_${safeSegment(tenant.tenantCode)}`)
  const job: MirrorFullSyncJob = {
    cloudDumpJobId: null,
    completedAt: null,
    downloadedBytes: 0,
    error: null,
    id: randomUUID(),
    localDatabase: mirrorDatabase,
    phase: "request-cloud-dump",
    sourceDatabase: null,
    startedAt: new Date().toISOString(),
    status: "running",
    tableCount: 0,
    rowCount: 0,
    tenantConnectionId: id,
  }
  jobs.set(job.id, job)
  await saveMirrorJob(tenant.id, job, "cloud-to-local", "full")
  void execute(job, tenant, baseUrl, clientTool)
  return { ...job }
}

export function getMirrorFullSyncJob(id: string): MirrorFullSyncJob | null {
  const job = jobs.get(id)
  return job ? { ...job } : null
}

export async function listMirrorFullSyncJobs(): Promise<MirrorFullSyncJob[]> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<MirrorJobRow[]>("SELECT * FROM cxsync_mirror_jobs WHERE direction = 'cloud-to-local' AND mode = 'full' ORDER BY created_at DESC LIMIT 25")
  return rows.map(toJob)
}

export async function listMirrorIncrementalSyncJobs(): Promise<MirrorIncrementalSyncJob[]> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<MirrorJobRow[]>("SELECT * FROM cxsync_mirror_jobs WHERE direction = 'cloud-to-local' AND mode = 'incremental' ORDER BY created_at DESC LIMIT 25")
  return rows.map(toIncrementalJob)
}

export async function exportMirrorAudit(id: string): Promise<{ path: string }> {
  const database = await getCxSyncDatabase()
  const [jobRows] = await database.execute<Array<MirrorJobRow & { evidence_json: string | null; mode: string }>>("SELECT * FROM cxsync_mirror_jobs WHERE id = ? LIMIT 1", [id])
  const job = jobRows[0]
  if (!job) throw new Error("Mirror job was not found for audit export.")
  const [cursorRows] = await database.execute<RowDataPacket[]>("SELECT * FROM cxsync_mirror_cursors WHERE mirror_job_id = ? ORDER BY created_at", [id])
  const report = {
    exportedAt: new Date().toISOString(),
    job: {
      completedAt: isoDate(job.last_completed_at),
      error: job.last_error,
      id: job.id,
      mode: job.mode,
      phase: job.current_phase,
      rowCount: Number(job.row_count ?? 0),
      sourceDatabase: job.source_database,
      startedAt: isoDate(job.last_started_at),
      status: job.status,
      tableCount: Number(job.table_count ?? 0),
      targetDatabase: job.target_database,
      tenantConnectionId: job.tenant_connection_id,
    },
    evidence: safeJson(job.evidence_json),
    cursors: cursorRows.map((row) => ({
      cursorType: row.cursor_type,
      cursorValue: row.cursor_value,
      highWatermark: safeJson(row.high_watermark_json),
      sourceDatabase: row.source_database,
      targetDatabase: row.target_database,
      verifiedAt: isoDate(row.verified_at),
    })),
  }
  const directory = resolve(app.getPath("userData"), "mirror", "audit")
  await mkdir(directory, { recursive: true })
  const path = resolve(directory, `mirror-audit-${safeSegment(id)}.json`)
  await writeFile(path, JSON.stringify(report, null, 2), "utf8")
  return { path }
}

export async function startMirrorFullSyncQueue(ids?: string[]): Promise<MirrorFullSyncQueue> {
  const database = await getCxSyncDatabase()
  const selected = ids?.length ? [...new Set(ids)] : await allTenantConnectionIds()
  if (!selected.length) throw new Error("No tenant connections are available for Mirror full-sync queue.")
  const queue = { id: randomUUID(), itemIds: [] as string[], running: true, startedAt: new Date().toISOString(), totalCount: selected.length }
  queues.set(queue.id, queue)
  await database.execute(
    "INSERT INTO cxsync_config (config_key, value_json, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = VALUES(updated_at)",
    [`mirror.queue.${queue.id}`, JSON.stringify({ id: queue.id, selected, startedAt: queue.startedAt, status: "running" }), sqlDate(new Date())],
  )
  void executeQueue(queue.id, selected)
  return getMirrorFullSyncQueue(queue.id)!
}

export function getMirrorFullSyncQueue(id: string): MirrorFullSyncQueue | null {
  const queue = queues.get(id)
  if (!queue) return null
  const items = queue.itemIds.map((itemId) => jobs.get(itemId)).filter((item): item is MirrorFullSyncJob => Boolean(item)).map((item) => ({ ...item }))
  const completedCount = items.filter((item) => item.status === "completed").length
  const failedCount = items.filter((item) => item.status === "failed").length
  const queuedCount = Math.max(0, queue.totalCount - completedCount - failedCount)
  const status = queue.stopped ? "stopped" : queue.running ? "running" : failedCount ? "completed-with-errors" : "completed"
  return { completedCount, failedCount, id: queue.id, items, queuedCount, startedAt: queue.startedAt, status, totalCount: queue.totalCount }
}

export async function getMirrorSchedule(): Promise<MirrorSchedule> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<Array<RowDataPacket & { value_json: string }>>("SELECT value_json FROM cxsync_config WHERE config_key = 'mirror.schedule' LIMIT 1")
  const parsed = rows[0]?.value_json ? JSON.parse(rows[0].value_json) as Partial<MirrorSchedule> : {}
  return normalizeSchedule(parsed)
}

export async function saveMirrorSchedule(schedule: MirrorSchedule): Promise<MirrorSchedule> {
  const normalized = normalizeSchedule(schedule)
  const database = await getCxSyncDatabase()
  await database.execute(
    "INSERT INTO cxsync_config (config_key, value_json, updated_at) VALUES ('mirror.schedule', ?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = VALUES(updated_at)",
    [JSON.stringify(normalized), sqlDate(new Date())],
  )
  return normalized
}

export async function startMirrorIncrementalSync(id: string, targetDatabase?: string): Promise<MirrorIncrementalSyncJob> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const localDatabase = normalizeDatabaseName(targetDatabase || `cxmirror_${safeSegment(tenant.tenantCode)}`)
  const job: MirrorIncrementalSyncJob = { completedAt: null, error: null, id: randomUUID(), localDatabase, phase: "pull", rowCount: 0, startedAt: new Date().toISOString(), status: "running", tableCount: 0, tenantConnectionId: id }
  incrementalJobs.set(job.id, job)
  await saveIncrementalJob(job, "running")
  void executeIncremental(job, tenant)
  return { ...job }
}

export function getMirrorIncrementalSyncJob(id: string): MirrorIncrementalSyncJob | null {
  const job = incrementalJobs.get(id)
  return job ? { ...job } : null
}

export async function startMirrorIncrementalSyncQueue(ids?: string[]): Promise<MirrorIncrementalSyncQueue> {
  const database = await getCxSyncDatabase()
  const selected = ids?.length ? [...new Set(ids)] : await allTenantConnectionIds()
  if (!selected.length) throw new Error("No tenant connections are available for Mirror incremental queue.")
  const queue = { id: randomUUID(), itemIds: [] as string[], running: true, startedAt: new Date().toISOString(), totalCount: selected.length }
  incrementalQueues.set(queue.id, queue)
  await database.execute(
    "INSERT INTO cxsync_config (config_key, value_json, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = VALUES(updated_at)",
    [`mirror.incrementalQueue.${queue.id}`, JSON.stringify({ id: queue.id, selected, startedAt: queue.startedAt, status: "running" }), sqlDate(new Date())],
  )
  void executeIncrementalQueue(queue.id, selected)
  return getMirrorIncrementalSyncQueue(queue.id)!
}

export function getMirrorIncrementalSyncQueue(id: string): MirrorIncrementalSyncQueue | null {
  const queue = incrementalQueues.get(id)
  if (!queue) return null
  const items = queue.itemIds.map((itemId) => incrementalJobs.get(itemId)).filter((item): item is MirrorIncrementalSyncJob => Boolean(item)).map((item) => ({ ...item }))
  const completedCount = items.filter((item) => item.status === "completed").length
  const failedCount = items.filter((item) => item.status === "failed").length
  const queuedCount = Math.max(0, queue.totalCount - completedCount - failedCount)
  const status = queue.stopped ? "stopped" : queue.paused ? "paused" : queue.running ? "running" : failedCount ? "completed-with-errors" : "completed"
  return { completedCount, failedCount, id: queue.id, items, queuedCount, startedAt: queue.startedAt, status, totalCount: queue.totalCount }
}

export function pauseMirrorIncrementalSyncQueue(id: string): MirrorIncrementalSyncQueue | null {
  const queue = incrementalQueues.get(id)
  if (!queue || queue.stopped || !queue.running) return getMirrorIncrementalSyncQueue(id)
  queue.paused = true
  return getMirrorIncrementalSyncQueue(id)
}

export function resumeMirrorIncrementalSyncQueue(id: string): MirrorIncrementalSyncQueue | null {
  const queue = incrementalQueues.get(id)
  if (!queue || queue.stopped) return getMirrorIncrementalSyncQueue(id)
  queue.paused = false
  return getMirrorIncrementalSyncQueue(id)
}

export function stopMirrorIncrementalSyncQueue(id: string): MirrorIncrementalSyncQueue | null {
  const queue = incrementalQueues.get(id)
  if (!queue) return null
  queue.stopped = true
  queue.paused = false
  return getMirrorIncrementalSyncQueue(id)
}

export function startMirrorScheduler() {
  if (schedulerTimer) return
  schedulerTimer = setInterval(() => { void runDueSchedule() }, 60_000)
  void runDueSchedule()
}

export function stopMirrorScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer)
  schedulerTimer = null
}

async function executeQueue(queueId: string, ids: string[]) {
  const queue = queues.get(queueId)
  if (!queue) return
  try {
    for (const id of ids) {
      if (queue.stopped) break
      const tenant = await getPrivateTenantConnection(id)
      const job = await startMirrorFullSync(id, tenant ? `cxmirror_${safeSegment(tenant.tenantCode)}` : undefined)
      queue.itemIds.push(job.id)
      await waitForLocalJob(job.id)
    }
  } finally {
    queue.running = false
  }
}

async function executeIncrementalQueue(queueId: string, ids: string[]) {
  const queue = incrementalQueues.get(queueId)
  if (!queue) return
  try {
    for (const id of ids) {
      if (queue.stopped) break
      while (queue.paused && !queue.stopped) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000))
      if (queue.stopped) break
      const tenant = await getPrivateTenantConnection(id)
      const job = await startMirrorIncrementalSync(id, tenant ? `cxmirror_${safeSegment(tenant.tenantCode)}` : undefined)
      queue.itemIds.push(job.id)
      await waitForIncrementalJob(job.id)
    }
  } finally {
    queue.running = false
  }
}

async function waitForLocalJob(id: string) {
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const job = jobs.get(id)
    if (job && job.status !== "running") return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
  }
  throw new Error("Mirror full-sync job did not finish within the queue polling window.")
}

async function waitForIncrementalJob(id: string) {
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const job = incrementalJobs.get(id)
    if (job && job.status !== "running") return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
  }
  throw new Error("Mirror incremental job did not finish within the queue polling window.")
}

async function allTenantConnectionIds() {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<Array<RowDataPacket & { id: string }>>("SELECT id FROM cxsync_tenant_connections ORDER BY tenant_name, tenant_code")
  return rows.map((row) => row.id)
}

async function runDueSchedule() {
  const schedule = await getMirrorSchedule()
  if (!schedule.enabled) return
  const next = schedule.nextRunAt ? new Date(schedule.nextRunAt) : nextRunAt(schedule.time, schedule.timezone, null)
  if (next.getTime() > Date.now()) return
  if ([...queues.values()].some((queue) => queue.running) || [...incrementalQueues.values()].some((queue) => queue.running)) return
  const queue = schedule.mode === "incremental" ? await startMirrorIncrementalSyncQueue() : await startMirrorFullSyncQueue()
  const updated = normalizeSchedule({ ...schedule, lastRunAt: queue.startedAt, nextRunAt: nextRunAt(schedule.time, schedule.timezone, new Date()).toISOString() })
  await saveMirrorSchedule(updated)
}

async function execute(job: MirrorFullSyncJob, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, baseUrl: string, clientTool: string) {
  try {
    const headers = await cxSyncCloudHeaders({ Accept: "application/json", "Content-Type": "application/json" })
    const start = await fetch(`${baseUrl}/api/v1/cxsync-cloud/mirror/full-dumps`, {
      body: JSON.stringify({ corporateId: tenant.corporateId, tenantCode: tenant.tenantCode }),
      headers,
      method: "POST",
    })
    const startBody = await start.json().catch(() => null) as { error?: string; job?: CloudDumpJob } | null
    if (!start.ok || !startBody?.job) throw new Error(startBody?.error || `Cloud mirror dump start returned HTTP ${start.status}.`)
    job.cloudDumpJobId = startBody.job.id
    job.sourceDatabase = startBody.job.database
    await updateMirrorJob(job, "running", null)

    const cloudJob = await waitForCloudDump(baseUrl, startBody.job.id)
    job.tableCount = cloudJob.tableCount
    job.rowCount = cloudJob.rowCount
    job.phase = "download"
    await updateMirrorJob(job, "running", null)

    const directory = resolve(app.getPath("userData"), "mirror", safeSegment(tenant.tenantCode), job.id)
    await mkdir(directory, { recursive: true })
    const dumpPath = resolve(directory, `${safeSegment(cloudJob.database)}.sql`)
    await downloadDump(baseUrl, cloudJob.id, dumpPath, job)
    const file = await stat(dumpPath)
    if (!file.size) throw new Error("Downloaded Mirror dump is empty.")

    job.phase = "restore-local"
    await updateMirrorJob(job, "running", null)
    await restoreIntoLocal(clientTool, dumpPath, job.localDatabase, tenant)

    job.phase = "verify"
    const evidence = await localEvidence(tenant, job.localDatabase)
    verifyRows(cloudJob.rows ?? {}, evidence.rows)
    job.tableCount = evidence.tableCount
    job.rowCount = evidence.rowCount
    job.downloadedBytes = file.size
    job.completedAt = new Date().toISOString()
    job.phase = "completed"
    job.status = "completed"
    await updateMirrorJob(job, "completed", null)
    await saveMirrorCursor(job, tenant, cloudJob)
  } catch (reason) {
    job.completedAt = new Date().toISOString()
    job.error = reason instanceof Error ? reason.message : "Mirror full sync failed."
    job.phase = "failed"
    job.status = "failed"
    await updateMirrorJob(job, "failed", job.error)
  }
}

async function executeIncremental(job: MirrorIncrementalSyncJob, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  try {
    const status = await getServiceKeyStatus()
    const baseUrl = status.cloudServiceUrl?.replace(/\/+$/, "")
    if (!baseUrl) throw new Error("Configure the CXSync Cloud service URL before Mirror incremental sync.")
    await ensureFullBootstrapCursor(tenant.id, job.localDatabase)
    let cursors = await latestIncrementalCursors(tenant.id, job.localDatabase)
    const headers = await cxSyncCloudHeaders({ Accept: "application/json", "Content-Type": "application/json" })
    job.phase = "upsert"
    await saveIncrementalJob(job, "running")
    let tableCount = 0
    let rowCount = 0
    let sourceDatabase = ""
    let coverage: IncrementalPull["coverage"] = { deletePropagation: "missing-tombstone-outbox", eligible: 0, skipped: [] }
    let deleteCount = 0
    let pageCount = 0
    const maxPages = Number(process.env.CXSYNC_MIRROR_INCREMENTAL_MAX_PAGES || 200)
    for (;;) {
      pageCount += 1
      if (pageCount > maxPages) throw new Error(`Mirror incremental sync stopped after ${maxPages} pages to prevent an endless catch-up loop.`)
      const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/mirror/incremental/pull`, {
        body: JSON.stringify({ corporateId: tenant.corporateId, cursors, limit: 1000, tenantCode: tenant.tenantCode }),
        headers,
        method: "POST",
      })
      const body = await response.json().catch(() => null) as { error?: string; incremental?: IncrementalPull } | null
      if (!response.ok || !body?.incremental) throw new Error(body?.error || `Cloud incremental pull returned HTTP ${response.status}.`)
      sourceDatabase = body.incremental.database
      coverage = body.incremental.coverage
      const nextCursors: Record<string, string | null> = { ...cursors }
      if (body.incremental.deleteCursor) nextCursors.__cxsync_mirror_tombstones = body.incremental.deleteCursor
      let pageRows = 0
      for (const table of body.incremental.tables) {
        if (table.nextCursor) nextCursors[table.table] = table.nextCursor
        if (!table.rows.length) continue
        await upsertRows(tenant, job.localDatabase, table)
        tableCount += 1
        rowCount += table.rows.length
        pageRows += table.rows.length
      }
      if (body.incremental.deletes.length) {
        const applied = await applyDeletes(tenant, job.localDatabase, body.incremental.deletes)
        deleteCount += applied
        pageRows += body.incremental.deletes.length
      }
      cursors = nextCursors
      if (!body.incremental.hasMore || pageRows === 0) break
    }
    job.tableCount = tableCount
    job.rowCount = rowCount
    job.completedAt = new Date().toISOString()
    job.phase = "completed"
    job.status = "completed"
    await saveIncrementalJob(job, "completed", { deletePropagation: coverage.deletePropagation, deletedRowCount: deleteCount, eligibleTableCount: coverage.eligible, pages: pageCount, pulledTableCount: tableCount, pulledRowCount: rowCount, skippedTables: coverage.skipped, sourceDatabase })
    await saveIncrementalCursor(job, tenant, sourceDatabase, cursors)
  } catch (reason) {
    job.completedAt = new Date().toISOString()
    job.error = reason instanceof Error ? reason.message : "Mirror incremental sync failed."
    job.phase = "failed"
    job.status = "failed"
    await saveIncrementalJob(job, "failed")
  }
}

async function applyDeletes(tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, database: string, deletes: IncrementalDelete[]) {
  const connection = await mysql.createConnection({ connectTimeout: 8_000, host: tenant.localHost, password: tenant.localPassword, port: tenant.localPort, user: tenant.localUser })
  try {
    let count = 0
    for (const item of deletes) {
      if (!/^[A-Za-z0-9_]+$/.test(item.table) || !/^[A-Za-z0-9_]+$/.test(item.primaryKey)) throw new Error(`Unsafe Mirror tombstone identifier for table ${item.table}.`)
      await connection.execute(`DELETE FROM \`${database}\`.\`${item.table}\` WHERE \`${item.primaryKey}\` = ?`, [item.primaryKeyValue])
      count += 1
    }
    return count
  } finally {
    await connection.end().catch(() => undefined)
  }
}

async function upsertRows(tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, database: string, table: IncrementalTable) {
  const connection = await mysql.createConnection({ connectTimeout: 8_000, host: tenant.localHost, password: tenant.localPassword, port: tenant.localPort, user: tenant.localUser })
  try {
    const [schemaRows] = await connection.execute<RowDataPacket[]>("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1", [database])
    if (!schemaRows.length) throw new Error(`Local mirror database ${database} does not exist. Run Mirror full sync first.`)
    const columns = table.columns.filter((column) => Object.prototype.hasOwnProperty.call(table.rows[0] ?? {}, column))
    if (!columns.includes(table.primaryKey)) throw new Error(`Incremental table ${table.table} did not include primary key ${table.primaryKey}.`)
    const quotedColumns = columns.map((column) => `\`${column.replaceAll("`", "``")}\``).join(", ")
    const placeholders = columns.map(() => "?").join(", ")
    const updates = columns.filter((column) => column !== table.primaryKey).map((column) => `\`${column.replaceAll("`", "``")}\` = VALUES(\`${column.replaceAll("`", "``")}\`)`).join(", ") || `\`${table.primaryKey.replaceAll("`", "``")}\` = VALUES(\`${table.primaryKey.replaceAll("`", "``")}\`)`
    const sql = `INSERT INTO \`${database}\`.\`${table.table.replaceAll("`", "``")}\` (${quotedColumns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`
    for (const row of table.rows) {
      const values = columns.map((column) => scalarValue(row[column]))
      await connection.execute(sql, values)
    }
  } finally {
    await connection.end().catch(() => undefined)
  }
}

function scalarValue(value: unknown): string | number | boolean | Date | Buffer | null {
  if (value == null) return null
  if (value instanceof Date || Buffer.isBuffer(value)) return value
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  return JSON.stringify(value)
}

async function latestIncrementalCursors(tenantConnectionId: string, localDatabase: string): Promise<Record<string, string | null>> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<Array<RowDataPacket & { high_watermark_json: string | null }>>(
    `SELECT high_watermark_json FROM cxsync_mirror_cursors
     WHERE tenant_connection_id = ? AND target_database = ? AND cursor_type = 'updated-at-json'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantConnectionId, localDatabase],
  )
  if (!rows[0]?.high_watermark_json) return {}
  try {
    const parsed = JSON.parse(rows[0].high_watermark_json) as Record<string, string | null>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

async function ensureFullBootstrapCursor(tenantConnectionId: string, localDatabase: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<Array<RowDataPacket & { id: string }>>(
    `SELECT id FROM cxsync_mirror_cursors
     WHERE tenant_connection_id = ? AND target_database = ? AND cursor_type = 'full-dump-sha256'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantConnectionId, localDatabase],
  )
  if (!rows.length) throw new Error(`Run Mirror full sync first for ${localDatabase}; incremental sync requires a verified full-dump bootstrap cursor.`)
}

async function saveIncrementalJob(job: MirrorIncrementalSyncJob, status: string, evidence?: Record<string, unknown>) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_mirror_jobs
      (id, tenant_connection_id, direction, mode, source_database, target_database, current_phase, table_count, row_count, downloaded_bytes, cloud_job_id, evidence_json, schedule_cron, status, last_started_at, last_completed_at, last_error, created_at, updated_at)
     VALUES (?, ?, 'cloud-to-local', 'incremental', ?, ?, ?, ?, ?, 0, NULL, ?, NULL, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE source_database = VALUES(source_database), target_database = VALUES(target_database), current_phase = VALUES(current_phase), table_count = VALUES(table_count), row_count = VALUES(row_count), evidence_json = VALUES(evidence_json), status = VALUES(status), last_completed_at = VALUES(last_completed_at), last_error = VALUES(last_error), updated_at = VALUES(updated_at)`,
    [
      job.id,
      job.tenantConnectionId,
      typeof evidence?.sourceDatabase === "string" ? evidence.sourceDatabase : null,
      job.localDatabase,
      job.phase,
      job.tableCount,
      job.rowCount,
      evidence ? JSON.stringify(evidence) : null,
      status,
      sqlDate(new Date(job.startedAt)),
      job.completedAt ? sqlDate(new Date(job.completedAt)) : null,
      job.error,
      sqlDate(new Date(job.startedAt)),
      sqlDate(new Date()),
    ],
  )
}

async function saveIncrementalCursor(job: MirrorIncrementalSyncJob, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, sourceDatabase: string, nextCursors: Record<string, string | null>) {
  const values = Object.values(nextCursors).filter((value): value is string => typeof value === "string")
  const cursorValue = values.sort().at(-1) ?? null
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_mirror_cursors
     (id, mirror_job_id, tenant_connection_id, source_database, target_database, cursor_type, cursor_value, high_watermark_json, verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'updated-at-json', ?, ?, ?, ?, ?)`,
    [randomUUID(), job.id, tenant.id, sourceDatabase, job.localDatabase, cursorValue, JSON.stringify(nextCursors), sqlDate(new Date()), sqlDate(new Date()), sqlDate(new Date())],
  )
}

async function waitForCloudDump(baseUrl: string, id: string): Promise<CloudDumpJob> {
  const headers = await cxSyncCloudHeaders({ Accept: "application/json" })
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/mirror/full-dumps/${id}`, { headers })
    const body = await response.json().catch(() => null) as { error?: string; job?: CloudDumpJob } | null
    if (!response.ok || !body?.job) throw new Error(body?.error || `Cloud mirror dump status returned HTTP ${response.status}.`)
    if (body.job.status === "completed") return body.job
    if (body.job.status === "failed") throw new Error(body.job.error || "Cloud mirror dump failed.")
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))
  }
  throw new Error("Cloud mirror dump did not finish within the polling window.")
}

async function downloadDump(baseUrl: string, id: string, path: string, job: MirrorFullSyncJob) {
  const headers = await cxSyncCloudHeaders()
  const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/mirror/full-dumps/${id}/download`, { headers })
  if (!response.ok || !response.body) throw new Error(`Cloud mirror dump download returned HTTP ${response.status}.`)
  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(path, { flags: "wx" })
    let downloaded = 0
    Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>)
      .on("data", (chunk: Buffer) => {
        downloaded += chunk.length
        job.downloadedBytes = downloaded
      })
      .on("error", reject)
      .pipe(output)
    output.on("error", reject)
    output.on("finish", resolvePromise)
  })
}

async function restoreIntoLocal(tool: string, path: string, database: string, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({ connectTimeout: 8_000, host: tenant.localHost, password: tenant.localPassword, port: tenant.localPort, user: tenant.localUser })
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await connection?.end().catch(() => undefined)
  }
  await new Promise<void>((resolvePromise, reject) => {
    const input = createReadStream(path)
    const child = spawn(tool, [`--host=${tenant.localHost}`, `--port=${tenant.localPort}`, `--user=${tenant.localUser}`, "--default-character-set=utf8mb4", database], { env: { ...process.env, MYSQL_PWD: tenant.localPassword }, stdio: ["pipe", "ignore", "pipe"], windowsHide: true })
    let stderr = ""
    child.stderr.on("data", (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on("error", reject)
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`Mirror local restore failed${stderr.trim() ? `: ${stderr.trim()}` : ` with exit ${code}`}`)))
    input.on("error", reject)
    input.pipe(child.stdin)
  })
}

async function localEvidence(tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, database: string) {
  const connection = await mysql.createConnection({ connectTimeout: 8_000, host: tenant.localHost, password: tenant.localPassword, port: tenant.localPort, user: tenant.localUser })
  try {
    const [tables] = await connection.execute<RowDataPacket[]>(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`, [database])
    const rowsByTable: Record<string, number> = {}
    for (const table of tables) {
      const name = String(table.TABLE_NAME)
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM \`${database}\`.\`${name.replaceAll("`", "``")}\``)
      rowsByTable[name] = Number(rows[0]?.count ?? 0)
    }
    return { rowCount: Object.values(rowsByTable).reduce((sum, count) => sum + count, 0), rows: rowsByTable, tableCount: tables.length }
  } finally {
    await connection.end().catch(() => undefined)
  }
}

async function saveMirrorJob(tenantConnectionId: string, job: MirrorFullSyncJob, direction: string, mode: string) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_mirror_jobs
      (id, tenant_connection_id, direction, mode, source_database, target_database, current_phase, table_count, row_count, downloaded_bytes, cloud_job_id, schedule_cron, status, last_started_at, last_completed_at, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?)`,
    [job.id, tenantConnectionId, direction, mode, job.sourceDatabase, job.localDatabase, job.phase, job.tableCount, job.rowCount, job.downloadedBytes, job.cloudDumpJobId, job.status, sqlDate(new Date(job.startedAt)), sqlDate(new Date(job.startedAt)), sqlDate(new Date())],
  )
}

async function updateMirrorJob(job: MirrorFullSyncJob, status: string, error: string | null) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `UPDATE cxsync_mirror_jobs
     SET status = ?, source_database = ?, target_database = ?, current_phase = ?, table_count = ?, row_count = ?, downloaded_bytes = ?, cloud_job_id = ?, last_completed_at = ?, last_error = ?, updated_at = ?
     WHERE id = ?`,
    [status, job.sourceDatabase, job.localDatabase, job.phase, job.tableCount, job.rowCount, job.downloadedBytes, job.cloudDumpJobId, job.completedAt ? sqlDate(new Date(job.completedAt)) : null, error, sqlDate(new Date()), job.id],
  )
}

async function saveMirrorCursor(job: MirrorFullSyncJob, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>, cloudJob: CloudDumpJob) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_mirror_cursors
      (id, mirror_job_id, tenant_connection_id, source_database, target_database, cursor_type, cursor_value, high_watermark_json, verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'full-dump-sha256', ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      job.id,
      tenant.id,
      cloudJob.database,
      job.localDatabase,
      cloudJob.sha256,
      JSON.stringify({ cloudDumpJobId: cloudJob.id, rowCount: cloudJob.rowCount, tableCount: cloudJob.tableCount }),
      sqlDate(new Date()),
      sqlDate(new Date()),
      sqlDate(new Date()),
    ],
  )
}

type CloudDumpJob = { database: string; error: string | null; id: string; rowCount: number; rows?: Record<string, number>; sha256: string | null; status: "queued" | "running" | "completed" | "failed"; tableCount: number }
type IncrementalPull = { coverage: { deletePropagation: "enabled" | "missing-tombstone-outbox"; eligible: number; skipped: Array<{ reason: string; table: string }> }; database: string; deleteCursor: string | null; deletes: IncrementalDelete[]; hasMore: boolean; tables: IncrementalTable[]; tenantCode: string }
type IncrementalDelete = { deletedAt: string; primaryKey: string; primaryKeyValue: string; table: string }
type IncrementalTable = { columns: string[]; nextCursor: string | null; primaryKey: string; rows: Array<Record<string, unknown>>; table: string; updatedColumn: string }
type MirrorJobRow = RowDataPacket & { cloud_job_id: string | null; completed_at?: string | null; current_phase: string | null; downloaded_bytes: number; id: string; last_completed_at: string | null; last_error: string | null; last_started_at: string | null; row_count: number; source_database: string | null; status: MirrorFullSyncJob["status"]; table_count: number; target_database: string | null; tenant_connection_id: string }

function verifyRows(cloudRows: Record<string, number>, localRows: Record<string, number>) {
  const missing = Object.keys(cloudRows).filter((table) => localRows[table] == null)
  const extra = Object.keys(localRows).filter((table) => cloudRows[table] == null)
  const changed = Object.entries(cloudRows).filter(([table, count]) => localRows[table] !== count)
  if (missing.length || extra.length || changed.length) {
    throw new Error(`Mirror per-table verification failed. Missing: ${missing.slice(0, 5).join(", ") || "none"}; extra: ${extra.slice(0, 5).join(", ") || "none"}; changed: ${changed.slice(0, 5).map(([table, count]) => `${table} cloud ${count}/local ${localRows[table] ?? "missing"}`).join(", ") || "none"}.`)
  }
}

function normalizeDatabaseName(value: string) {
  const name = value.trim()
  if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) throw new Error("Mirror local database name must contain only letters, numbers, and underscores.")
  if (!name.startsWith("cxmirror_")) throw new Error("Mirror local database name must start with cxmirror_ to prevent overwriting working tenant databases.")
  return name
}

function safeSegment(value: string) { return value.replace(/[^a-zA-Z0-9_]/g, "_") || "mirror" }
function sqlDate(value: Date) { return value.toISOString().slice(0, 23).replace("T", " ") }
function isoDate(value: string | Date | null) { if (!value) return null; return value instanceof Date ? value.toISOString() : value.includes("T") ? value : `${value.replace(" ", "T")}Z` }
function safeJson(value: unknown) { if (typeof value !== "string" || !value) return null; try { return JSON.parse(value) } catch { return null } }
function toJob(row: MirrorJobRow): MirrorFullSyncJob {
  return {
    cloudDumpJobId: row.cloud_job_id,
    completedAt: isoDate(row.last_completed_at),
    downloadedBytes: Number(row.downloaded_bytes ?? 0),
    error: row.last_error,
    id: row.id,
    localDatabase: row.target_database || "",
    phase: fullPhase(row.current_phase, row.status),
    rowCount: Number(row.row_count ?? 0),
    sourceDatabase: row.source_database,
    startedAt: isoDate(row.last_started_at) || new Date().toISOString(),
    status: row.status,
    tableCount: Number(row.table_count ?? 0),
    tenantConnectionId: row.tenant_connection_id,
  }
}

function toIncrementalJob(row: MirrorJobRow): MirrorIncrementalSyncJob {
  return {
    completedAt: isoDate(row.last_completed_at),
    error: row.last_error,
    id: row.id,
    localDatabase: row.target_database || "",
    phase: incrementalPhase(row.current_phase, row.status),
    rowCount: Number(row.row_count ?? 0),
    startedAt: isoDate(row.last_started_at) || new Date().toISOString(),
    status: row.status,
    tableCount: Number(row.table_count ?? 0),
    tenantConnectionId: row.tenant_connection_id,
  }
}

function fullPhase(value: string | null, status: MirrorFullSyncJob["status"]): MirrorFullSyncJob["phase"] {
  return value === "request-cloud-dump" || value === "download" || value === "restore-local" || value === "verify" || value === "completed" || value === "failed" ? value : status === "completed" ? "completed" : status === "failed" ? "failed" : "request-cloud-dump"
}

function incrementalPhase(value: string | null, status: MirrorIncrementalSyncJob["status"]): MirrorIncrementalSyncJob["phase"] {
  return value === "pull" || value === "upsert" || value === "completed" || value === "failed" ? value : status === "completed" ? "completed" : status === "failed" ? "failed" : "pull"
}

function normalizeSchedule(input: Partial<MirrorSchedule>): MirrorSchedule {
  const time = typeof input.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ? input.time : "02:00"
  const timezone = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "local"
  const lastRunAt = input.lastRunAt ?? null
  const nextRun = input.nextRunAt ?? nextRunAt(time, timezone, lastRunAt ? new Date(lastRunAt) : null).toISOString()
  const mode = input.mode === "incremental" ? "incremental" : "full"
  return { enabled: Boolean(input.enabled), lastRunAt, mode, nextRunAt: nextRun, target: "all-tenants", time, timezone }
}

function nextRunAt(time: string, _timezone: string, after: Date | null) {
  const [hour, minute] = time.split(":").map(Number)
  const base = after ? new Date(after) : new Date()
  const next = new Date(base)
  next.setHours(hour ?? 2, minute ?? 0, 0, 0)
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
  return next
}
