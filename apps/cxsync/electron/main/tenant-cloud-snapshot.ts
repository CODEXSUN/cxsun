import { randomUUID } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import type { TenantCloudSnapshot } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"

type SnapshotRow = RowDataPacket & {
  created_at: string
  id: string
  manifest_json: string | null
  source_version: string | null
  status: TenantCloudSnapshot["status"]
}

type CloudLoginResponse = {
  error?: string
  ok?: boolean
  token?: string
}

type CloudHealthResponse = {
  status?: string
  timestamp?: string
  uptime?: number
  version?: string
}

type CloudSessionResponse = {
  ok?: boolean
  error?: string
  selectedTenant?: {
    name?: string | null
    slug?: string | null
  }
  user?: {
    email?: string | null
  }
}

export async function getTenantCloudSnapshot(id: string): Promise<TenantCloudSnapshot | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<SnapshotRow[]>(
    `SELECT id, source_version, status, manifest_json, created_at
     FROM cxsync_data_snapshots
     WHERE tenant_connection_id = ? AND snapshot_type = 'cloud-status'
     ORDER BY created_at DESC
     LIMIT 1`,
    [id],
  )
  return rows[0] ? snapshotFromRow(rows[0]) : null
}

export async function captureTenantCloudSnapshot(id: string): Promise<TenantCloudSnapshot> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")

  const baseUrl = tenant.cloudApiUrl.replace(/\/+$/, "")
  const capturedAt = new Date().toISOString()
  const snapshotId = randomUUID()
  let token = ""
  let cloudVersion = "unavailable"
  let message = ""
  const health: TenantCloudSnapshot["health"] = { latencyMs: 0, ok: false, status: "not checked" }
  const session: TenantCloudSnapshot["session"] = { latencyMs: 0, ok: false, selectedTenant: null, userEmail: null }

  try {
    const login = await loginCloud(baseUrl, tenant)
    token = login.token

    const [healthResult, sessionResult] = await Promise.allSettled([
      readCloudHealth(baseUrl),
      readCloudSession(baseUrl, token, tenant.cloudDomain),
    ])

    if (healthResult.status === "fulfilled") {
      health.latencyMs = healthResult.value.latencyMs
      health.ok = true
      health.status = healthResult.value.body.status ?? "ok"
      cloudVersion = healthResult.value.body.version ?? "unknown"
    } else {
      health.status = messageOf(healthResult.reason)
    }

    if (sessionResult.status === "fulfilled") {
      session.latencyMs = sessionResult.value.latencyMs
      session.ok = true
      session.selectedTenant = sessionResult.value.body.selectedTenant?.slug
        ?? sessionResult.value.body.selectedTenant?.name
        ?? null
      session.userEmail = sessionResult.value.body.user?.email ?? null
    } else {
      session.selectedTenant = messageOf(sessionResult.reason)
    }

    const status: TenantCloudSnapshot["status"] = health.ok && session.ok ? "ready" : "partial"
    message = status === "ready"
      ? "Cloud API login, session token, and health endpoint verified."
      : "Cloud login worked, but one or more cloud checks need attention."

    const snapshot: TenantCloudSnapshot = {
      apiUrl: baseUrl,
      capturedAt,
      cloudVersion,
      domain: tenant.cloudDomain,
      health,
      id: snapshotId,
      message,
      session,
      status,
      tenantCode: tenant.tenantCode,
    }
    await saveCloudSnapshot(id, snapshot)
    return snapshot
  } catch (error) {
    const snapshot: TenantCloudSnapshot = {
      apiUrl: baseUrl,
      capturedAt,
      cloudVersion,
      domain: tenant.cloudDomain,
      health,
      id: snapshotId,
      message: messageOf(error),
      session,
      status: "failed",
      tenantCode: tenant.tenantCode,
    }
    await saveCloudSnapshot(id, snapshot)
    return snapshot
  }
}

async function loginCloud(baseUrl: string, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    body: JSON.stringify({
      corporateId: tenant.corporateId,
      email: tenant.cloudAdminEmail,
      password: tenant.cloudAdminPassword,
      surface: "tenant",
    }),
    headers: {
      "Content-Type": "application/json",
      ...(tenant.cloudDomain ? { "x-login-domain": tenant.cloudDomain } : {}),
    },
    method: "POST",
  })
  const body = await safeJson<CloudLoginResponse>(response)
  if (!response.ok || !body.ok) throw new Error(body.error || `Cloud login returned HTTP ${response.status}.`)
  if (!body.token) throw new Error("Cloud login succeeded but did not return a session token.")
  return { token: body.token }
}

async function readCloudHealth(baseUrl: string) {
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}/health`, { cache: "no-store" })
  const body = await safeJson<CloudHealthResponse>(response)
  if (!response.ok) throw new Error(`Cloud health returned HTTP ${response.status}.`)
  return { body, latencyMs: Date.now() - startedAt }
}

async function readCloudSession(baseUrl: string, token: string, cloudDomain: string) {
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(cloudDomain ? { "x-login-domain": cloudDomain } : {}),
    },
  })
  const body = await safeJson<CloudSessionResponse>(response)
  if (!response.ok || !body.ok) throw new Error(body.error || `Cloud session returned HTTP ${response.status}.`)
  return { body, latencyMs: Date.now() - startedAt }
}

async function saveCloudSnapshot(tenantConnectionId: string, snapshot: TenantCloudSnapshot) {
  const database = await getCxSyncDatabase()
  const capturedAt = sqlDate(new Date(snapshot.capturedAt))
  await database.execute(
    `INSERT INTO cxsync_data_snapshots
      (id, tenant_connection_id, snapshot_type, source_version, status, row_count, size_bytes, manifest_json, created_at, updated_at)
     VALUES (?, ?, 'cloud-status', ?, ?, 0, 0, ?, ?, ?)`,
    [
      snapshot.id,
      tenantConnectionId,
      snapshot.cloudVersion,
      snapshot.status,
      JSON.stringify(snapshot),
      capturedAt,
      capturedAt,
    ],
  )
}

async function safeJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    return {} as T
  }
}

function snapshotFromRow(row: SnapshotRow): TenantCloudSnapshot {
  const parsed = row.manifest_json ? JSON.parse(row.manifest_json) as TenantCloudSnapshot : null
  if (parsed) return parsed
  return {
    apiUrl: "",
    capturedAt: isoDate(row.created_at),
    cloudVersion: row.source_version ?? "unknown",
    domain: "",
    health: { latencyMs: 0, ok: row.status === "ready", status: row.status },
    id: row.id,
    message: "Saved cloud snapshot has no manifest details.",
    session: { latencyMs: 0, ok: false, selectedTenant: null, userEmail: null },
    status: row.status,
    tenantCode: "",
  }
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Cloud snapshot failed."
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function isoDate(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`
}
