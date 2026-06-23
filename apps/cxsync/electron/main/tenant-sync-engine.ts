import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import { app } from "electron"
import type { RowDataPacket } from "mysql2"
import { resolve } from "node:path"
import type { TenantCloudSchemaSnapshot, TenantDatabaseInspection, TenantSchemaDiffItem, TenantSyncJob, TenantSyncJobPhase, TenantSyncJobPhaseId, TenantSyncReportExport, TenantSyncServiceStatus } from "../../src/shared/connection-contracts.js"
import { cxSyncCloudHeaders } from "./cxsync-cloud-client.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { loadCxSyncEnvironment } from "./environment.js"
import { normalizeTenantCloudApiUrl } from "./tenant-cloud-api-url.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"
import { captureTenantCloudSnapshot } from "./tenant-cloud-snapshot.js"
import { inspectTenantDatabase } from "./tenant-database-inspector.js"
import { generateTenantUpgradePlan } from "./tenant-upgrade-planner.js"

type SyncJobRow = RowDataPacket & { report_json: string }
type SnapshotRow = RowDataPacket & { manifest_json: string | null }

export async function getTenantSyncJob(id: string): Promise<TenantSyncJob | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<SyncJobRow[]>(
    "SELECT report_json FROM cxsync_sync_jobs WHERE tenant_connection_id = ? ORDER BY started_at DESC LIMIT 1",
    [id],
  )
  return rows[0] ? JSON.parse(rows[0].report_json) as TenantSyncJob : null
}

export async function listTenantSyncJobs(id: string): Promise<TenantSyncJob[]> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<SyncJobRow[]>(
    "SELECT report_json FROM cxsync_sync_jobs WHERE tenant_connection_id = ? ORDER BY started_at DESC LIMIT 50",
    [id],
  )
  return rows.map((row) => JSON.parse(row.report_json) as TenantSyncJob)
}

export async function checkTenantSyncService(id: string): Promise<TenantSyncServiceStatus> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const baseUrl = await cxSyncCloudServiceUrl()
  const startedAt = Date.now()
  try {
    const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/status`, { cache: "no-store", headers: await cxSyncCloudHeaders() })
    const body = await response.json() as { ok?: boolean; service?: string }
    if (!response.ok || !body.ok) throw new Error(`CXSync Cloud status returned HTTP ${response.status}.`)
    return { apiUrl: baseUrl, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, message: "CXSync Cloud service is reachable.", ok: true, service: body.service ?? "cxsync-cloud" }
  } catch (error) {
    return { apiUrl: baseUrl, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, message: error instanceof Error ? error.message : "CXSync Cloud service check failed.", ok: false, service: "cxsync-cloud" }
  }
}

export async function retryTenantSyncJob(id: string): Promise<TenantSyncJob> {
  const latest = await getTenantSyncJob(id)
  if (!latest || latest.status !== "failed") throw new Error("Only the latest failed sync job can be retried.")
  return runTenantSyncJob(id)
}

export async function exportTenantSyncReport(id: string): Promise<TenantSyncReportExport> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const job = await getTenantSyncJob(id)
  if (!job) throw new Error("No sync job is available to export.")
  const safeReport = {
    exportedAt: new Date().toISOString(),
    job,
    tenant: {
      cloudApiUrl: tenant.cloudApiUrl,
      cloudDomain: tenant.cloudDomain,
      corporateId: tenant.corporateId,
      localDatabase: tenant.localDatabase,
      tenantCode: tenant.tenantCode,
      tenantName: tenant.tenantName,
    },
  }
  const directory = resolve(app.getPath("userData"), "reports")
  await import("node:fs/promises").then(({ mkdir }) => mkdir(directory, { recursive: true }))
  const fileName = `cxsync-report-${safeSegment(tenant.tenantCode)}-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.json`
  const path = resolve(directory, fileName)
  await writeFile(path, JSON.stringify(safeReport, null, 2), "utf8")
  return { fileName, path }
}

export async function runTenantSyncJob(id: string): Promise<TenantSyncJob> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")

  const job: TenantSyncJob = {
    cloudSnapshotId: null,
    completedAt: null,
    id: randomUUID(),
    localSnapshotId: null,
    phases: phaseTemplate(),
    startedAt: new Date().toISOString(),
    status: "running",
    summary: { cloudTables: 0, diffTotal: 0, localTables: 0, uploadReportId: null },
  }
  await saveJob(id, job)

  let cloudSchema: TenantCloudSchemaSnapshot | null = null
  let localInspection: TenantDatabaseInspection | null = null
  let diff: TenantSchemaDiffItem[] = []

  try {
    complete(job, "tenant-details", `Tenant ${tenant.tenantCode} mapped to local ${tenant.localDatabase} and cloud ${tenant.cloudApiUrl}.`)
    await saveJob(id, job)

    start(job, "download")
    const cloud = await captureTenantCloudSnapshot(id)
    job.cloudSnapshotId = cloud.id
    cloudSchema = cloud.schema
    if (!cloudSchema) throw new Error(cloud.message || "Cloud tenant schema snapshot was not available.")
    job.summary.cloudTables = cloudSchema.totals.tableCount
    complete(job, "download", `Downloaded cloud schema metadata: ${cloudSchema.totals.tableCount} tables, ${cloudSchema.totals.columnCount} columns.`)
    await saveJob(id, job)

    start(job, "verify-before")
    localInspection = await inspectTenantDatabase(id)
    job.localSnapshotId = localInspection.snapshotId
    job.summary.localTables = localInspection.totals.tableCount
    diff = diffLocalToCloud(cloudSchema, localInspection)
    job.summary.diffTotal = diff.length
    complete(job, "verify-before", diff.length ? `${diff.length} local/cloud schema difference(s) found.` : "Local and cloud schema metadata match.")
    await saveJob(id, job)

    start(job, "migrate")
    if (diff.length) {
      await saveCloudBaseline(id, cloudSchema)
      const plan = await generateTenantUpgradePlan(id)
      requireApproval(job, "migrate", `Generated migration plan ${plan.id.slice(0, 8)} with ${plan.summary.total} step(s). Review backup/preflight/execute before changing local schema.`)
      skip(job, "verify-after", "Waiting for approved local migration execution.")
      skip(job, "upload-report", "Final report upload is waiting for migration approval.")
      job.status = "approval-required"
      job.completedAt = new Date().toISOString()
      await saveJob(id, job)
      return job
    }
    skip(job, "migrate", "No local migration needed.")
    await saveJob(id, job)

    start(job, "verify-after")
    localInspection = await inspectTenantDatabase(id)
    diff = diffLocalToCloud(cloudSchema, localInspection)
    job.summary.diffTotal = diff.length
    if (diff.length) throw new Error(`Post-verify still found ${diff.length} difference(s).`)
    complete(job, "verify-after", "Post-verify confirmed local and cloud schema metadata match.")
    await saveJob(id, job)

    start(job, "upload-report")
    job.summary.uploadReportId = await uploadReport(id, job)
    complete(job, "upload-report", `Uploaded sync audit report ${job.summary.uploadReportId}.`)
    job.status = "completed"
    job.completedAt = new Date().toISOString()
    await saveJob(id, job)
    return job
  } catch (error) {
    failCurrent(job, error instanceof Error ? error.message : "Sync job failed.")
    job.status = "failed"
    job.completedAt = new Date().toISOString()
    await saveJob(id, job)
    return job
  }
}

export async function continueTenantSyncJob(id: string): Promise<TenantSyncJob> {
  const job = await getTenantSyncJob(id)
  if (!job) throw new Error("Run a bounded sync job before continuing.")
  if (job.status !== "approval-required") throw new Error("Only approval-required sync jobs can be continued.")
  if (!job.cloudSnapshotId) throw new Error("The sync job does not have a cloud snapshot to verify against.")

  const cloudSchema = await loadCloudSchemaSnapshot(id, job.cloudSnapshotId)
  if (!cloudSchema) throw new Error("Saved cloud schema snapshot was not found. Run a new bounded sync.")

  job.status = "running"
  job.completedAt = null
  complete(job, "migrate", "Approved local migration is expected to be completed through the Upgrade Plan tab.")
  await saveJob(id, job)

  try {
    start(job, "verify-after")
    let localInspection = await inspectTenantDatabase(id)
    job.localSnapshotId = localInspection.snapshotId
    job.summary.localTables = localInspection.totals.tableCount
    let diff = diffLocalToCloud(cloudSchema, localInspection)
    job.summary.diffTotal = diff.length
    if (diff.length) throw new Error(`Post-migration verify still found ${diff.length} local/cloud difference(s).`)
    complete(job, "verify-after", "Post-migration verify confirmed local and cloud schema metadata match.")
    await saveJob(id, job)

    start(job, "upload-report")
    job.summary.uploadReportId = await uploadReport(id, job)
    complete(job, "upload-report", `Uploaded final sync audit report ${job.summary.uploadReportId}.`)
    job.status = "completed"
    job.completedAt = new Date().toISOString()
    await saveJob(id, job)
    return job
  } catch (error) {
    failCurrent(job, error instanceof Error ? error.message : "Sync continuation failed.")
    job.status = "failed"
    job.completedAt = new Date().toISOString()
    await saveJob(id, job)
    return job
  }
}

async function saveCloudBaseline(id: string, schema: TenantCloudSchemaSnapshot) {
  const database = await getCxSyncDatabase()
  const now = sqlDate(new Date())
  const baselineId = randomUUID()
  const inspection = cloudToInspection(schema)
  await database.execute("UPDATE cxsync_schema_baselines SET is_active = 0, updated_at = ? WHERE tenant_connection_id = ?", [now, id])
  await database.execute(
    `INSERT INTO cxsync_schema_baselines
      (id, tenant_connection_id, baseline_name, source, schema_hash, manifest_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'cloud', ?, ?, 1, ?, ?)`,
    [baselineId, id, `Cloud schema ${new Date(schema.capturedAt).toLocaleString("en-IN")}`, schema.schemaHash, JSON.stringify(inspection), now, now],
  )
}

function cloudToInspection(schema: TenantCloudSchemaSnapshot): TenantDatabaseInspection {
  return { capturedAt: schema.capturedAt, columns: schema.columns, database: schema.database, indexes: schema.indexes, snapshotId: randomUUID(), tables: schema.tables, totals: schema.totals }
}

function diffLocalToCloud(cloud: TenantCloudSchemaSnapshot, local: TenantDatabaseInspection): TenantSchemaDiffItem[] {
  const items: TenantSchemaDiffItem[] = []
  const cloudTables = new Map(cloud.tables.map((table) => [table.tableName, table]))
  const localTables = new Map(local.tables.map((table) => [table.tableName, table]))
  for (const [name, expected] of cloudTables) {
    const actual = localTables.get(name)
    if (!actual) items.push({ expected: "present in cloud", actual: "missing locally", message: "Cloud table is missing locally.", objectName: name, objectType: "table", severity: "critical", status: "missing" })
    else if ((expected.engine || "").toLowerCase() !== (actual.engine || "").toLowerCase()) items.push({ expected: expected.engine, actual: actual.engine, message: "Table engine differs.", objectName: name, objectType: "table", severity: "warning", status: "changed" })
  }
  for (const name of localTables.keys()) if (!cloudTables.has(name)) items.push({ actual: "present locally", expected: "missing in cloud", message: "Local table is not present in cloud metadata.", objectName: name, objectType: "table", severity: "warning", status: "extra" })
  const cloudColumns = new Map(cloud.columns.map((column) => [`${column.tableName}.${column.columnName}`, column]))
  const localColumns = new Map(local.columns.map((column) => [`${column.tableName}.${column.columnName}`, column]))
  for (const [name, expected] of cloudColumns) {
    const actual = localColumns.get(name)
    if (!actual) items.push({ expected: expected.columnType, actual: "missing locally", message: "Cloud column is missing locally.", objectName: name, objectType: "column", severity: "critical", status: "missing" })
    else if (expected.columnType !== actual.columnType || expected.isNullable !== actual.isNullable || String(expected.columnDefault ?? "") !== String(actual.columnDefault ?? "") || expected.extra !== actual.extra) items.push({ expected: describeColumn(expected), actual: describeColumn(actual), message: "Column definition differs.", objectName: name, objectType: "column", severity: "warning", status: "changed" })
  }
  for (const name of localColumns.keys()) if (!cloudColumns.has(name)) items.push({ actual: "present locally", expected: "missing in cloud", message: "Local column is not present in cloud metadata.", objectName: name, objectType: "column", severity: "info", status: "extra" })
  return items
}

function describeColumn(column: { columnDefault: string | null; columnType: string; extra: string; isNullable: boolean }) {
  return `${column.columnType} ${column.isNullable ? "NULL" : "NOT NULL"} DEFAULT ${column.columnDefault ?? "NULL"} ${column.extra}`.trim()
}

async function uploadReport(id: string, job: TenantSyncJob) {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const baseUrl = await normalizeTenantCloudApiUrl(tenant.cloudApiUrl)
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    body: JSON.stringify({ corporateId: tenant.corporateId, email: tenant.cloudAdminEmail, password: tenant.cloudAdminPassword, surface: "tenant" }),
    headers: { ...(await cxSyncCloudHeaders({ "Content-Type": "application/json" })), ...(tenant.cloudDomain ? { "x-login-domain": tenant.cloudDomain } : {}) },
    method: "POST",
  })
  const login = await loginResponse.json() as { ok?: boolean; token?: string; error?: string }
  if (!loginResponse.ok || !login.ok || !login.token) throw new Error(login.error || "Could not login to upload sync report.")
  const response = await fetch(`${baseUrl}/api/v1/cxsync/reports`, {
    body: JSON.stringify({ jobId: job.id, phases: job.phases, summary: job.summary }),
    headers: { ...(await cxSyncCloudHeaders({ Authorization: `Bearer ${login.token}`, "Content-Type": "application/json" })), ...(tenant.cloudDomain ? { "x-login-domain": tenant.cloudDomain } : {}) },
    method: "POST",
  })
  const body = await response.json() as { ok?: boolean; reportId?: string; error?: string }
  if (!response.ok || !body.ok || !body.reportId) throw new Error(body.error || `Report upload returned HTTP ${response.status}.`)
  return body.reportId
}

async function loadCloudSchemaSnapshot(id: string, snapshotId: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<SnapshotRow[]>(
    `SELECT manifest_json
     FROM cxsync_data_snapshots
     WHERE tenant_connection_id = ? AND id = ? AND snapshot_type = 'cloud-status'
     LIMIT 1`,
    [id, snapshotId],
  )
  if (!rows[0]?.manifest_json) return null
  const snapshot = JSON.parse(rows[0].manifest_json) as { schema?: TenantCloudSchemaSnapshot | null }
  return snapshot.schema ?? null
}

function phaseTemplate(): TenantSyncJobPhase[] {
  return [
    { id: "tenant-details", label: "Get tenant database details", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
    { id: "download", label: "Download cloud snapshot", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
    { id: "verify-before", label: "Verify local vs cloud", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
    { id: "migrate", label: "Prepare/migrate local", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
    { id: "verify-after", label: "Verify after migration", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
    { id: "upload-report", label: "Upload audit report", detail: "Waiting.", startedAt: null, finishedAt: null, status: "pending" },
  ]
}

function phase(job: TenantSyncJob, id: TenantSyncJobPhaseId) {
  return job.phases.find((item) => item.id === id)!
}
function start(job: TenantSyncJob, id: TenantSyncJobPhaseId) { const item = phase(job, id); item.status = "running"; item.startedAt = new Date().toISOString(); item.detail = "Running." }
function complete(job: TenantSyncJob, id: TenantSyncJobPhaseId, detail: string) { const item = phase(job, id); item.status = "completed"; item.startedAt ??= new Date().toISOString(); item.finishedAt = new Date().toISOString(); item.detail = detail }
function skip(job: TenantSyncJob, id: TenantSyncJobPhaseId, detail: string) { const item = phase(job, id); item.status = "skipped"; item.finishedAt = new Date().toISOString(); item.detail = detail }
function requireApproval(job: TenantSyncJob, id: TenantSyncJobPhaseId, detail: string) { const item = phase(job, id); item.status = "approval-required"; item.finishedAt = new Date().toISOString(); item.detail = detail }
function failCurrent(job: TenantSyncJob, detail: string) { const item = job.phases.find((phase) => phase.status === "running") ?? job.phases.find((phase) => phase.status === "pending"); if (item) { item.status = "failed"; item.finishedAt = new Date().toISOString(); item.detail = detail } }

async function saveJob(id: string, job: TenantSyncJob) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_sync_jobs (id, tenant_connection_id, status, current_phase, report_json, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), current_phase = VALUES(current_phase), report_json = VALUES(report_json), completed_at = VALUES(completed_at)`,
    [job.id, id, job.status, job.phases.find((phase) => phase.status === "running")?.id ?? job.phases.find((phase) => phase.status === "approval-required")?.id ?? "completed", JSON.stringify(job), sqlDate(new Date(job.startedAt)), job.completedAt ? sqlDate(new Date(job.completedAt)) : null],
  )
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "tenant"
}

async function cxSyncCloudServiceUrl() {
  const env = await loadCxSyncEnvironment()
  const value = (env.CXSYNC_CLOUD_PUBLIC_URL || "").trim().replace(/\/+$/, "")
  if (!value) throw new Error("CXSYNC_CLOUD_PUBLIC_URL is not configured.")
  const parsed = new URL(value)
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("CXSYNC_CLOUD_PUBLIC_URL must start with http:// or https://.")
  return value
}
