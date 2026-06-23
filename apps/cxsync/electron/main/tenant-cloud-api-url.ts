import { loadCxSyncEnvironment } from "./environment.js"

const CXSYNC_DESKTOP_PORT = "6044"

export async function normalizeTenantCloudApiUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  if (!normalized) throw new Error("Tenant cloud API URL is required.")

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error("Tenant cloud API URL must be a valid http:// or https:// URL.")
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Tenant cloud API URL must start with http:// or https://.")
  }

  const env = await loadCxSyncEnvironment()
  const cxSyncCloudUrl = (env.CXSYNC_CLOUD_PUBLIC_URL || "").trim().replace(/\/+$/, "")
  const cxSyncCloudPort = (env.CXSYNC_CLOUD_PORT || "6077").trim()
  const appServerPort = (env.PORT || "6005").trim()

  if (parsed.port === CXSYNC_DESKTOP_PORT) {
    throw new Error(`Tenant cloud API URL cannot use port ${CXSYNC_DESKTOP_PORT}. That is the CXSync desktop/Vite screen. Use the tenant backend API URL instead, usually http://127.0.0.1:${appServerPort} in local development.`)
  }

  if (parsed.port === cxSyncCloudPort || sameUrl(normalized, cxSyncCloudUrl)) {
    throw new Error(`Tenant cloud API URL cannot use the CXSync Cloud service URL (${cxSyncCloudUrl || `port ${cxSyncCloudPort}`}). Tenant handshake needs the billing/admin backend that owns /api/v1/auth/login, usually http://127.0.0.1:${appServerPort} in local development.`)
  }

  return normalized
}

function sameUrl(left: string, right: string) {
  if (!left || !right) return false
  try {
    return new URL(left).toString().replace(/\/+$/, "") === new URL(right).toString().replace(/\/+$/, "")
  } catch {
    return left.replace(/\/+$/, "") === right.replace(/\/+$/, "")
  }
}
