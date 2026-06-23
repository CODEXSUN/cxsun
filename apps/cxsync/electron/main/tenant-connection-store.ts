import { app, safeStorage } from "electron"
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import type { TenantConnection, TenantConnectionInput, TenantConnectionVerification, TenantHandshakeHistoryItem } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { normalizeTenantCloudApiUrl } from "./tenant-cloud-api-url.js"

type TenantRow = RowDataPacket & {
  cloud_admin_email: string
  cloud_api_url: string
  cloud_domain: string
  corporate_id: string
  created_at: string
  encrypted_cloud_password: string
  encrypted_local_password: string
  id: string
  local_database: string
  local_host: string
  local_port: number
  local_user: string
  tenant_code: string
  tenant_name: string
  updated_at: string
}

type HandshakeRow = RowDataPacket & {
  id: number
  cloud_latency_ms: number
  cloud_message: string
  cloud_ok: number
  cloud_version: string
  local_database: string
  local_latency_ms: number
  local_message: string
  local_ok: number
  local_version: string
  tenant_connection_id: string
  verified_at: string
  versions_match: number
}

let legacyMigration: Promise<void> | null = null

export async function listTenantConnections(): Promise<TenantConnection[]> {
  await migrateLegacyRegistry()
  const database = await getCxSyncDatabase()
  const [rows] = await database.query<TenantRow[]>("SELECT * FROM cxsync_tenant_connections ORDER BY tenant_name, tenant_code")
  const handshakes = await latestHandshakes(rows.map((row) => row.id))
  return rows.map((row) => toPublic(row, handshakes.get(row.id) ?? null))
}

export async function getTenantConnection(id: string): Promise<TenantConnection | null> {
  await migrateLegacyRegistry()
  const row = await findRow(id)
  if (!row) return null
  const handshakes = await latestHandshakes([id])
  return toPublic(row, handshakes.get(id) ?? null)
}

export async function getPrivateTenantConnection(id: string) {
  const row = await findRow(id)
  if (!row) return null
  const handshakes = await latestHandshakes([id])
  return {
    ...toPublic(row, handshakes.get(id) ?? null),
    cloudAdminPassword: decrypt(row.encrypted_cloud_password),
    localPassword: decrypt(row.encrypted_local_password),
  }
}

export async function saveTenantConnection(input: TenantConnectionInput, id?: string): Promise<TenantConnection> {
  const database = await getCxSyncDatabase()
  const current = id ? await findRow(id) : null
  const now = sqlDate(new Date())
  const recordId = current?.id ?? randomUUID()
  const cloudApiUrl = await normalizeTenantCloudApiUrl(input.cloudApiUrl)
  validateCloudDomain(input.cloudDomain, cloudApiUrl)
  const encryptedCloudPassword = input.cloudAdminPassword ? encrypt(input.cloudAdminPassword) : current?.encrypted_cloud_password ?? ""
  const encryptedLocalPassword = input.localPassword ? encrypt(input.localPassword) : current?.encrypted_local_password ?? ""
  if (!encryptedCloudPassword || !encryptedLocalPassword) throw new Error("Local and cloud passwords are required.")

  if (current) {
    await database.execute(
      `UPDATE cxsync_tenant_connections SET
        tenant_name = ?, tenant_code = ?, corporate_id = ?,
        local_host = ?, local_port = ?, local_database = ?, local_user = ?, encrypted_local_password = ?,
        cloud_api_url = ?, cloud_domain = ?, cloud_admin_email = ?, encrypted_cloud_password = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        input.tenantName, input.tenantCode, input.corporateId,
        input.localHost, input.localPort, input.localDatabase, input.localUser, encryptedLocalPassword,
        cloudApiUrl, input.cloudDomain, input.cloudAdminEmail, encryptedCloudPassword,
        now, recordId,
      ],
    )
  } else {
    await database.execute(
      `INSERT INTO cxsync_tenant_connections (
        id, tenant_name, tenant_code, corporate_id,
        local_host, local_port, local_database, local_user, encrypted_local_password,
        cloud_api_url, cloud_domain, cloud_admin_email, encrypted_cloud_password,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, input.tenantName, input.tenantCode, input.corporateId,
        input.localHost, input.localPort, input.localDatabase, input.localUser, encryptedLocalPassword,
        cloudApiUrl, input.cloudDomain, input.cloudAdminEmail, encryptedCloudPassword,
        now, now,
      ],
    )
  }
  const saved = await getTenantConnection(recordId)
  if (!saved) throw new Error("Tenant connection could not be read after saving.")
  return saved
}

export async function deleteTenantConnection(id: string) {
  const database = await getCxSyncDatabase()
  await database.execute<ResultSetHeader>("DELETE FROM cxsync_tenant_connections WHERE id = ?", [id])
}

export async function saveTenantHandshake(id: string, handshake: TenantConnectionVerification) {
  const database = await getCxSyncDatabase()
  const verifiedAt = sqlDate(new Date(handshake.verifiedAt))
  await database.execute(
    `INSERT INTO cxsync_handshake_history (
      tenant_connection_id, verified_at,
      local_ok, local_database, local_latency_ms, local_message, local_version,
      cloud_ok, cloud_latency_ms, cloud_message, cloud_version,
      versions_match, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, verifiedAt,
      handshake.local.ok ? 1 : 0, handshake.local.database, handshake.local.latencyMs, handshake.local.message, handshake.local.version,
      handshake.cloud.ok ? 1 : 0, handshake.cloud.latencyMs, handshake.cloud.message, handshake.cloud.version,
      handshake.versionsMatch ? 1 : 0, verifiedAt,
    ],
  )
  await database.execute(
    `INSERT INTO cxsync_analytics_snapshots
      (tenant_connection_id, metric_key, metric_value, payload_json, captured_at)
     VALUES (?, 'handshake.total_latency_ms', ?, ?, ?)`,
    [
      id,
      handshake.local.latencyMs + handshake.cloud.latencyMs,
      JSON.stringify({ cloudOk: handshake.cloud.ok, localOk: handshake.local.ok, versionsMatch: handshake.versionsMatch }),
      verifiedAt,
    ],
  )
}

export async function listTenantHandshakeHistory(id: string): Promise<TenantHandshakeHistoryItem[]> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<HandshakeRow[]>(
    `SELECT *
     FROM cxsync_handshake_history
     WHERE tenant_connection_id = ?
     ORDER BY id DESC
     LIMIT 25`,
    [id],
  )
  return rows.map((row) => ({ ...toHandshake(row), id: Number(row.id) }))
}

async function findRow(id: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<TenantRow[]>("SELECT * FROM cxsync_tenant_connections WHERE id = ? LIMIT 1", [id])
  return rows[0] ?? null
}

async function latestHandshakes(ids: string[]) {
  const results = new Map<string, TenantConnectionVerification>()
  if (!ids.length) return results
  const database = await getCxSyncDatabase()
  const placeholders = ids.map(() => "?").join(",")
  const [rows] = await database.query<HandshakeRow[]>(
    `SELECT h.*
     FROM cxsync_handshake_history h
     INNER JOIN (
       SELECT tenant_connection_id, MAX(id) AS latest_id
       FROM cxsync_handshake_history
       WHERE tenant_connection_id IN (${placeholders})
       GROUP BY tenant_connection_id
     ) latest ON latest.latest_id = h.id`,
    ids,
  )
  for (const row of rows) results.set(row.tenant_connection_id, toHandshake(row))
  return results
}

async function migrateLegacyRegistry() {
  if (!legacyMigration) legacyMigration = importLegacyRegistry()
  await legacyMigration
}

async function importLegacyRegistry() {
  const database = await getCxSyncDatabase()
  const [markers] = await database.execute<Array<RowDataPacket & { config_key: string }>>(
    "SELECT config_key FROM cxsync_config WHERE config_key = 'legacy_json_imported' LIMIT 1",
  )
  if (markers.length) return

  try {
    const records = JSON.parse(await readFile(resolve(app.getPath("userData"), "tenant-connections.json"), "utf8")) as Array<Record<string, unknown>>
    for (const record of records) {
      await database.execute(
        `INSERT IGNORE INTO cxsync_tenant_connections (
          id, tenant_name, tenant_code, corporate_id,
          local_host, local_port, local_database, local_user, encrypted_local_password,
          cloud_api_url, cloud_domain, cloud_admin_email, encrypted_cloud_password,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(record.id), String(record.tenantName), String(record.tenantCode), String(record.corporateId),
          String(record.localHost), Number(record.localPort), String(record.localDatabase), String(record.localUser), String(record.encryptedLocalPassword),
          String(record.cloudApiUrl), String(record.cloudDomain), String(record.cloudAdminEmail), String(record.encryptedCloudPassword),
          toSqlDate(record.createdAt), toSqlDate(record.updatedAt),
        ],
      )
      if (record.lastHandshake) await saveTenantHandshake(String(record.id), record.lastHandshake as TenantConnectionVerification)
    }
  } catch {
    // No legacy registry exists.
  }

  await database.execute(
    "INSERT INTO cxsync_config (config_key, value_json, updated_at) VALUES ('legacy_json_imported', ?, ?)",
    [JSON.stringify({ imported: true }), sqlDate(new Date())],
  )
}

function toPublic(row: TenantRow, lastHandshake: TenantConnectionVerification | null): TenantConnection {
  return {
    cloudAdminEmail: row.cloud_admin_email,
    cloudApiUrl: row.cloud_api_url,
    cloudDomain: row.cloud_domain,
    corporateId: row.corporate_id,
    createdAt: isoDate(row.created_at),
    hasCloudPassword: Boolean(row.encrypted_cloud_password),
    hasLocalPassword: Boolean(row.encrypted_local_password),
    id: row.id,
    lastHandshake,
    localDatabase: row.local_database,
    localHost: row.local_host,
    localPort: Number(row.local_port),
    localUser: row.local_user,
    tenantCode: row.tenant_code,
    tenantName: row.tenant_name,
    updatedAt: isoDate(row.updated_at),
  }
}

function toHandshake(row: HandshakeRow): TenantConnectionVerification {
  return {
    cloud: {
      latencyMs: Number(row.cloud_latency_ms),
      message: row.cloud_message,
      ok: Boolean(row.cloud_ok),
      version: row.cloud_version,
    },
    local: {
      database: row.local_database,
      latencyMs: Number(row.local_latency_ms),
      message: row.local_message,
      ok: Boolean(row.local_ok),
      version: row.local_version,
    },
    verifiedAt: isoDate(row.verified_at),
    versionsMatch: Boolean(row.versions_match),
  }
}

function encrypt(value: string) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows credential encryption is unavailable.")
  return safeStorage.encryptString(value).toString("base64")
}

function decrypt(value: string) {
  if (!value) return ""
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows credential encryption is unavailable.")
  return safeStorage.decryptString(Buffer.from(value, "base64"))
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function toSqlDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return sqlDate(Number.isNaN(date.getTime()) ? new Date() : date)
}

function validateCloudDomain(value: string, apiUrl: string) {
  const domain = value.trim()
  if (!domain) throw new Error("Login domain is required.")
  if (/^https?:\/\//i.test(domain)) throw new Error("Login domain must be only the tenant domain or slug, not a URL. Example: codexsun.com")
  if (domain.includes(":")) throw new Error("Login domain must not include a port. Use API URL for http://127.0.0.1:6005 and Login domain for the tenant identity, for example codexsun.com.")
  const api = new URL(apiUrl)
  if (isLocalHost(api.hostname) && isLocalHost(domain)) {
    throw new Error("When API URL is local, Login domain still must be the tenant identity, for example codexsun.com, not localhost or 127.0.0.1.")
  }
}

function isLocalHost(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
}

function isoDate(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`
}
