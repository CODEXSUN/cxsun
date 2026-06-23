import { sql } from 'kysely'
import { Inject } from '../../../server/src/core/decorators/inject.js'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import { getDatabase } from '../../../server/src/infrastructure/database/connection.js'
import { CloudTenantSnapshotConnector } from '../connectors/cloud-tenant-snapshot.connector.js'
import { SyncReporter } from '../reporters/sync.reporter.js'

export interface CxSyncCloudEngineStatus {
  connectors: ReturnType<CloudTenantSnapshotConnector['status']>[]
  mode: 'metadata-only'
  reporters: ReturnType<SyncReporter['status']>[]
  ready: boolean
}

export interface CxSyncCloudHandshakeInput {
  apiUrl?: string
  backend?: unknown
  checkedAt?: string
  desktopId?: string
  frontend?: unknown
  latencyMs?: number
  message?: string
  ok?: boolean
  service?: string
  status?: string
}

export interface CxSyncCloudHandshakeRecord {
  apiUrl: string
  checkedAt: string
  desktopId: string
  id: number
  latencyMs: number
  message: string
  ok: boolean
  payload: CxSyncCloudHandshakeInput
  service: string
  status: string
}

export interface CxSyncMasterTenantRecord {
  corporateId: string
  id: number
  tenantCode: string
  tenantName: string
}

@Injectable()
export class CxSyncCloudEngine {
  constructor(
    @Inject(CloudTenantSnapshotConnector) private readonly tenantSnapshot: CloudTenantSnapshotConnector,
    @Inject(SyncReporter) private readonly reporter: SyncReporter,
  ) {}

  status(): CxSyncCloudEngineStatus {
    return {
      connectors: [this.tenantSnapshot.status()],
      mode: 'metadata-only',
      ready: true,
      reporters: [this.reporter.status()],
    }
  }

  async latestHandshake(): Promise<CxSyncCloudHandshakeRecord | null> {
    await ensureHandshakeTable()
    const database = getDatabase()
    const result = await sql<HandshakeRow>`
      SELECT id, desktop_id, service, status, ok, api_url, latency_ms, message, payload_json, checked_at
      FROM cxsync_cloud_handshake_events
      ORDER BY checked_at DESC, id DESC
      LIMIT 1
    `.execute(database)
    const row = result.rows[0]
    return row ? mapHandshakeRow(row) : null
  }

  async recordHandshake(input: CxSyncCloudHandshakeInput): Promise<CxSyncCloudHandshakeRecord> {
    await ensureHandshakeTable()
    const database = getDatabase()
    const checkedAt = safeDate(input.checkedAt)
    const payloadJson = JSON.stringify(input ?? {})
    const record = {
      apiUrl: stringOr(input.apiUrl, 'unknown'),
      checkedAt: checkedAt.toISOString(),
      desktopId: stringOr(input.desktopId, 'desktop'),
      latencyMs: numberOr(input.latencyMs, 0),
      message: stringOr(input.message, input.ok ? 'Desktop handshake accepted.' : 'Desktop handshake recorded.'),
      ok: Boolean(input.ok),
      service: stringOr(input.service, 'cxsync-cloud'),
      status: stringOr(input.status, input.ok ? 'accepted' : 'unknown'),
    }

    await sql`
      INSERT INTO cxsync_cloud_handshake_events
        (desktop_id, service, status, ok, api_url, latency_ms, message, payload_json, checked_at, created_at)
      VALUES
        (${record.desktopId}, ${record.service}, ${record.status}, ${record.ok ? 1 : 0}, ${record.apiUrl}, ${record.latencyMs}, ${record.message}, ${payloadJson}, ${sqlDate(checkedAt)}, UTC_TIMESTAMP(3))
    `.execute(database)

    const latest = await this.latestHandshake()
    if (!latest) throw new Error('CXSync Cloud handshake was not saved.')
    return latest
  }

  async listMasterTenants(): Promise<CxSyncMasterTenantRecord[]> {
    const database = getDatabase()
    const result = await sql<MasterTenantRow>`
      SELECT id, name, code, corporate_id
      FROM tenants
      WHERE deleted_at IS NULL
      ORDER BY name, code
    `.execute(database)
    return result.rows.map((row) => ({
      corporateId: row.corporate_id ?? '',
      id: Number(row.id),
      tenantCode: String(row.code ?? ''),
      tenantName: row.name,
    }))
  }
}

interface HandshakeRow {
  api_url: string
  checked_at: Date | string
  desktop_id: string
  id: number
  latency_ms: number
  message: string
  ok: number | boolean
  payload_json: string
  service: string
  status: string
}

interface MasterTenantRow {
  code: number | string
  corporate_id: string | null
  id: number
  name: string
}

let handshakeTableReady = false

async function ensureHandshakeTable() {
  if (handshakeTableReady) return
  const database = getDatabase()
  await database.schema
    .createTable('cxsync_cloud_handshake_events')
    .ifNotExists()
    .addColumn('id', 'bigint', (column) => column.primaryKey().autoIncrement())
    .addColumn('desktop_id', 'varchar(120)', (column) => column.notNull())
    .addColumn('service', 'varchar(80)', (column) => column.notNull())
    .addColumn('status', 'varchar(40)', (column) => column.notNull())
    .addColumn('ok', 'boolean', (column) => column.notNull())
    .addColumn('api_url', 'varchar(500)', (column) => column.notNull())
    .addColumn('latency_ms', 'integer', (column) => column.notNull())
    .addColumn('message', 'text', (column) => column.notNull())
    .addColumn('payload_json', 'json')
    .addColumn('checked_at', 'datetime', (column) => column.notNull())
    .addColumn('created_at', 'datetime', (column) => column.notNull())
    .execute()
  await sql`CREATE INDEX IF NOT EXISTS idx_cxsync_cloud_handshake_latest ON cxsync_cloud_handshake_events (checked_at, id)`.execute(database)
  handshakeTableReady = true
}

function mapHandshakeRow(row: HandshakeRow): CxSyncCloudHandshakeRecord {
  return {
    apiUrl: row.api_url,
    checkedAt: toIsoDate(row.checked_at),
    desktopId: row.desktop_id,
    id: Number(row.id),
    latencyMs: Number(row.latency_ms),
    message: row.message,
    ok: Boolean(row.ok),
    payload: parsePayload(row.payload_json),
    service: row.service,
    status: row.status,
  }
}

function parsePayload(value: string | null): CxSyncCloudHandshakeInput {
  if (!value) return {}
  try {
    return JSON.parse(value) as CxSyncCloudHandshakeInput
  } catch {
    return {}
  }
}

function safeDate(value: unknown) {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace('T', ' ')
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : fallback
}

function numberOr(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback
}

function toIsoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
