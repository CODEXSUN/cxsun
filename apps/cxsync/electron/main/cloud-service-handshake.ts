import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { cxSyncCloudHeaders } from "./cxsync-cloud-client.js"
import { loadCxSyncEnvironment } from "./environment.js"
import type { CxSyncCloudServiceHandshake } from "../../src/shared/connection-contracts.js"

const configKey = "cloud_service_handshake"

export async function getCloudServiceHandshake(): Promise<CxSyncCloudServiceHandshake | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<Array<RowDataPacket & { value_json: string }>>(
    "SELECT value_json FROM cxsync_config WHERE config_key = ? LIMIT 1",
    [configKey],
  )
  if (!rows.length) return null
  try {
    return JSON.parse(rows[0].value_json) as CxSyncCloudServiceHandshake
  } catch {
    return null
  }
}

export async function verifyCloudServiceHandshake(): Promise<CxSyncCloudServiceHandshake> {
  const env = await loadCxSyncEnvironment()
  const apiUrl = normalizeCloudUrl(env.CXSYNC_CLOUD_PUBLIC_URL || "")
  const serviceKey = env.CXSYNC_SERVICE_KEY?.trim()
  const startedAt = Date.now()

  if (!apiUrl) {
    return saveCloudServiceHandshake({
      apiUrl: "",
      backend: endpointResult(0, "Cloud backend URL is not configured.", false, null),
      checkedAt: new Date().toISOString(),
      frontend: endpointResult(0, "Cloud frontend URL is not configured.", false, null),
      latencyMs: 0,
      message: "Cloud service URL is not configured. Set CXSYNC_CLOUD_PUBLIC_URL in .env or save it from CXSync.",
      ok: false,
      service: "cxsync-cloud",
      status: "missing-url",
    })
  }

  if (!serviceKey) {
    return saveCloudServiceHandshake({
      apiUrl,
      backend: endpointResult(0, "Not checked because service key is missing.", false, null),
      checkedAt: new Date().toISOString(),
      frontend: await checkEndpoint(apiUrl),
      latencyMs: 0,
      message: "Service key not found. Generate the key locally and set the same CXSYNC_SERVICE_KEY on the cloud server.",
      ok: false,
      service: "cxsync-cloud",
      status: "missing-key",
    })
  }

  try {
    const frontend = await checkEndpoint(apiUrl)
    const response = await fetch(`${apiUrl}/api/v1/cxsync-cloud/status`, {
      headers: await cxSyncCloudHeaders({ Accept: "application/json" }),
      method: "GET",
    })
    const latencyMs = Date.now() - startedAt
    if (!response.ok) {
      return saveCloudServiceHandshake({
        apiUrl,
        backend: endpointResult(latencyMs, backendFailureMessage(response.status, frontend.ok), false, response.status),
        checkedAt: new Date().toISOString(),
        frontend,
        latencyMs,
        message: backendFailureMessage(response.status, frontend.ok),
        ok: false,
        service: "cxsync-cloud",
        status: "rejected",
      })
    }
    const payload = await response.json().catch(() => null) as { ok?: boolean; service?: string } | null
    const acceptedHandshake: CxSyncCloudServiceHandshake = {
      apiUrl,
      backend: endpointResult(latencyMs, "Cloud backend status endpoint accepted the desktop request.", true, response.status),
      checkedAt: new Date().toISOString(),
      frontend,
      latencyMs,
      message: "Cloud service accepted the desktop handshake.",
      ok: Boolean(payload?.ok ?? true),
      service: payload?.service || "cxsync-cloud",
      status: "accepted",
    }
    const cloudRecord = await recordHandshakeOnCloud(apiUrl, acceptedHandshake)
    return saveCloudServiceHandshake(cloudRecord.ok ? acceptedHandshake : {
      ...acceptedHandshake,
      backend: endpointResult(latencyMs, cloudRecord.message, true, response.status),
      message: cloudRecord.message,
    })
  } catch (error) {
    const frontend = await checkEndpoint(apiUrl)
    return saveCloudServiceHandshake({
      apiUrl,
      backend: endpointResult(Date.now() - startedAt, "Cloud backend status endpoint is unreachable.", false, null),
      checkedAt: new Date().toISOString(),
      frontend,
      latencyMs: Date.now() - startedAt,
      message: explainFetchFailure(apiUrl, frontend, error),
      ok: false,
      service: "cxsync-cloud",
      status: "unreachable",
    })
  }
}

async function recordHandshakeOnCloud(apiUrl: string, handshake: CxSyncCloudServiceHandshake) {
  try {
    const response = await fetch(`${apiUrl}/api/v1/cxsync-cloud/handshake`, {
      body: JSON.stringify({ ...handshake, desktopId: desktopId() }),
      headers: await cxSyncCloudHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
      method: "POST",
    })
    if (!response.ok) {
      return { message: `Cloud API accepted status, but could not save handshake record. HTTP ${response.status}.`, ok: false }
    }
    return { message: "Cloud handshake record saved.", ok: true }
  } catch (error) {
    return { message: `Cloud API accepted status, but handshake record upload failed: ${error instanceof Error ? error.message : "unknown error"}.`, ok: false }
  }
}

async function checkEndpoint(url: string) {
  const startedAt = Date.now()
  try {
    const response = await fetch(url, { method: "GET" })
    const reachable = response.status < 500
    return endpointResult(Date.now() - startedAt, reachable ? `Base URL is reachable with HTTP ${response.status}.` : `Base URL returned HTTP ${response.status}.`, reachable, response.status)
  } catch (error) {
    return endpointResult(Date.now() - startedAt, error instanceof Error ? error.message : "Base URL is unreachable.", false, null)
  }
}

function endpointResult(latencyMs: number, message: string, ok: boolean, statusCode: number | null) {
  return { latencyMs, message, ok, statusCode }
}

function backendFailureMessage(status: number, frontendOk: boolean) {
  if (status === 401 || status === 403) return "Cloud backend rejected the request. Service key is missing or different on the server."
  if (status === 404 && frontendOk) return "Frontend is reachable, but CXSync Cloud backend endpoint was not found. Use the backend API URL, usually http://127.0.0.1:6077, not the Vite UI port 6044."
  return `Cloud backend status endpoint returned HTTP ${status}.`
}

function explainFetchFailure(apiUrl: string, frontend: { ok: boolean }, error: unknown) {
  const baseMessage = error instanceof Error ? error.message : "Cloud service is unreachable."
  if (apiUrl.includes(":6044")) {
    return "This URL looks like the Vite frontend port 6044. Handshake needs the CXSync Cloud backend API, usually http://127.0.0.1:6077."
  }
  if (frontend.ok) return `Base URL is reachable, but backend status endpoint failed: ${baseMessage}`
  return baseMessage
}

async function saveCloudServiceHandshake(result: CxSyncCloudServiceHandshake) {
  const database = await getCxSyncDatabase()
  await database.execute<ResultSetHeader>(
    `INSERT INTO cxsync_config (config_key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = VALUES(updated_at)`,
    [configKey, JSON.stringify(result), sqlDate(new Date(result.checkedAt))],
  )
  return result
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function normalizeCloudUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  return normalized
}

function desktopId() {
  return (process.env.COMPUTERNAME || process.env.HOSTNAME || "desktop").trim() || "desktop"
}
