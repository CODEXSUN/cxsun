import { randomUUID } from 'node:crypto'
import { sql } from 'kysely'
import { BadRequestException, NotFoundException } from '../../../server/src/core/exceptions/http.exception.js'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import { getDatabase } from '../../../server/src/infrastructure/database/connection.js'

export interface SyncReporterStatus {
  name: 'sync-reporter'
  outputs: string[]
  ready: boolean
}

export interface CxSyncReportInput {
  jobId?: unknown
  phases?: unknown
  summary?: unknown
  tenant?: {
    corporateId?: unknown
    tenantCode?: unknown
    tenantName?: unknown
  }
}

export interface NormalizedCxSyncReportInput {
  corporateId: string
  jobId: string
  phases: unknown[]
  summary: Record<string, unknown> | null
  tenantCode: string
  tenantName: string
}

export interface CxSyncCloudReportRecord {
  duplicate: boolean
  jobId: string
  receivedAt: string
  reportId: string
  tenantCode: string
  tenantName: string
  tenantSlug: string
}

@Injectable()
export class SyncReporter {
  status(): SyncReporterStatus {
    return {
      name: 'sync-reporter',
      outputs: ['cxsync-cloud-database', 'server-log'],
      ready: true,
    }
  }

  async record(input: CxSyncReportInput): Promise<CxSyncCloudReportRecord> {
    const report = normalizeSyncReportInput(input)
    const tenant = await resolveMasterTenant(report)
    await ensureReportTable()

    const existing = await findReport(tenant.id, report.jobId)
    if (existing) return mapReport(existing, tenant, true)

    const reportId = randomUUID()
    const receivedAt = new Date()
    await sql`
      INSERT INTO cxsync_cloud_reports
        (id, tenant_id, tenant_slug, job_id, summary_json, report_json, received_at)
      VALUES
        (${reportId}, ${tenant.id}, ${tenant.slug}, ${report.jobId}, ${JSON.stringify(report.summary)}, ${JSON.stringify(report)}, ${sqlDate(receivedAt)})
    `.execute(getDatabase())

    console.log(JSON.stringify({
      at: receivedAt.toISOString(),
      jobId: report.jobId,
      reportId,
      service: 'cxsync-cloud',
      tenant: tenant.slug,
      type: 'sync-report',
    }))

    return {
      duplicate: false,
      jobId: report.jobId,
      receivedAt: receivedAt.toISOString(),
      reportId,
      tenantCode: String(tenant.code),
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    }
  }

  async list(limit = 50): Promise<CxSyncCloudReportRecord[]> {
    await ensureReportTable()
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 50, 1), 100)
    const result = await sql<ReportListRow>`
      SELECT r.id, r.job_id, r.received_at, r.tenant_slug, t.code AS tenant_code, t.name AS tenant_name
      FROM cxsync_cloud_reports r
      INNER JOIN tenants t ON t.id = r.tenant_id
      ORDER BY r.received_at DESC
      LIMIT ${safeLimit}
    `.execute(getDatabase())
    return result.rows.map((row) => ({
      duplicate: false,
      jobId: row.job_id,
      receivedAt: toIsoDate(row.received_at),
      reportId: row.id,
      tenantCode: String(row.tenant_code),
      tenantName: row.tenant_name,
      tenantSlug: row.tenant_slug,
    }))
  }
}

export function normalizeSyncReportInput(input: CxSyncReportInput): NormalizedCxSyncReportInput {
  const jobId = requiredString(input?.jobId, 'jobId', 36)
  const corporateId = requiredString(input?.tenant?.corporateId, 'tenant.corporateId', 120)
  const tenantCode = requiredString(input?.tenant?.tenantCode, 'tenant.tenantCode', 120)
  const tenantName = requiredString(input?.tenant?.tenantName, 'tenant.tenantName', 191)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
    throw new BadRequestException('jobId must be a UUID.')
  }
  if (!Array.isArray(input.phases)) throw new BadRequestException('phases must be an array.')
  if (input.summary != null && !isRecord(input.summary)) throw new BadRequestException('summary must be an object or null.')
  return {
    corporateId,
    jobId,
    phases: input.phases,
    summary: input.summary == null ? null : input.summary,
    tenantCode,
    tenantName,
  }
}

interface MasterTenantRow {
  code: number | string
  corporate_id: string | null
  id: number
  name: string
  slug: string
}

interface ReportRow {
  id: string
  job_id: string
  received_at: Date | string
  tenant_slug: string
}

interface ReportListRow extends ReportRow {
  tenant_code: number | string
  tenant_name: string
}

async function resolveMasterTenant(report: NormalizedCxSyncReportInput): Promise<MasterTenantRow> {
  const result = await sql<MasterTenantRow>`
    SELECT id, name, slug, code, corporate_id
    FROM tenants
    WHERE deleted_at IS NULL
      AND corporate_id = ${report.corporateId}
      AND CAST(code AS CHAR) = ${report.tenantCode}
    LIMIT 1
  `.execute(getDatabase())
  const tenant = result.rows[0]
  if (!tenant) throw new NotFoundException('CXSync tenant identity was not found in the master tenant registry.')
  return tenant
}

async function findReport(tenantId: number, jobId: string): Promise<ReportRow | null> {
  const result = await sql<ReportRow>`
    SELECT id, job_id, tenant_slug, received_at
    FROM cxsync_cloud_reports
    WHERE tenant_id = ${tenantId} AND job_id = ${jobId}
    LIMIT 1
  `.execute(getDatabase())
  return result.rows[0] ?? null
}

function mapReport(row: ReportRow, tenant: MasterTenantRow, duplicate: boolean): CxSyncCloudReportRecord {
  return {
    duplicate,
    jobId: row.job_id,
    receivedAt: toIsoDate(row.received_at),
    reportId: row.id,
    tenantCode: String(tenant.code),
    tenantName: tenant.name,
    tenantSlug: row.tenant_slug,
  }
}

let reportTableReady = false

async function ensureReportTable() {
  if (reportTableReady) return
  await sql`
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
  `.execute(getDatabase())
  reportTableReady = true
}

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required.`)
  return value.trim().slice(0, maxLength)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace('T', ' ')
}

function toIsoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
