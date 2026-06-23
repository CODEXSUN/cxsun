import type { CxSyncDesktopApi, TenantConnection } from "../../shared/connection-contracts"

const browserKey = "cxsync.preview.tenant-connections"
const browserCloudUrlKey = "cxsync.preview.cloud-service-url"
const browserServiceKey = "cxsync.cloud.service-key"

export function cxSyncCloudBrowserHeaders() {
  const key = sessionStorage.getItem(browserServiceKey)?.trim()
  return { Accept: "application/json", ...(key ? { "x-cxsync-service-key": key } : {}) }
}

export function cxSyncCloudBrowserUrl() {
  return readPreviewCloudUrl().replace(/\/+$/, "")
}

export function connectionClient(): CxSyncDesktopApi {
  return window.cxsyncDesktop ?? browserFallback
}

const browserFallback: CxSyncDesktopApi = {
  isDesktop: false,
  async authenticateLocalAdmin(email) {
    return { email, name: "Preview Admin", role: "super-admin" }
  },
  async captureCodebaseSchemaBaseline(id) {
    return {
      baselineName: "Browser preview codebase baseline",
      capturedAt: new Date().toISOString(),
      id,
      schemaHash: "preview-codebase",
      source: "codebase",
      totals: { columnCount: 0, dataLength: 0, indexCount: 0, indexLength: 0, missingPrimaryKeyCount: 0, rowsEstimate: 0, tableCount: 0 },
    }
  },
  async captureTenantSchemaBaseline(id) {
    return {
      baselineName: "Browser preview baseline",
      capturedAt: new Date().toISOString(),
      id,
      schemaHash: "preview",
      source: "local-inspection",
      totals: { columnCount: 0, dataLength: 0, indexCount: 0, indexLength: 0, missingPrimaryKeyCount: 0, rowsEstimate: 0, tableCount: 0 },
    }
  },
  async compareTenantSchema(id) {
    return {
      baseline: {
        baselineName: "Browser preview baseline",
        capturedAt: new Date().toISOString(),
        id,
        schemaHash: "preview",
        source: "local-inspection",
        totals: { columnCount: 0, dataLength: 0, indexCount: 0, indexLength: 0, missingPrimaryKeyCount: 0, rowsEstimate: 0, tableCount: 0 },
      },
      comparedAt: new Date().toISOString(),
      currentSnapshotId: crypto.randomUUID(),
      diffSnapshotId: crypto.randomUUID(),
      items: [],
      summary: { changed: 0, critical: 0, extra: 0, missing: 0, total: 0, warnings: 0 },
    }
  },
  async deleteTenantConnection(id) {
    writePreview(readPreview().filter((item) => item.id !== id))
  },
  async getLocalEnvironmentStatus() {
    return {
      appVersion: "preview",
      database: "Browser preview",
      databaseServerVersion: "Electron required",
      host: "127.0.0.1",
      ok: false,
      port: 3306,
      user: "preview",
    }
  },
  async getTenantConnection(id) {
    return readPreview().find((item) => item.id === id) ?? null
  },
  async getTenantCloudSnapshot() {
    return null
  },
  async getServiceKeyStatus() {
    const key = sessionStorage.getItem(browserServiceKey)?.trim() || ""
    return { cloudServiceUrl: readPreviewCloudUrl(), envPath: "Browser session", hasKey: Boolean(key), keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-6)}` : null, updatedAt: null }
  },
  async generateServiceKey() {
    const response = await fetch(`${cxSyncCloudBrowserUrl()}/api/v1/cxsync-cloud/service-key/generate`, { credentials: "include", method: "POST" })
    const body = await response.json().catch(() => null) as { error?: string; key?: string; keyPreview?: string; updatedAt?: string } | null
    if (!response.ok || !body?.key) throw new Error(body?.error || `Cloud key generation returned HTTP ${response.status}.`)
    return { cloudServiceUrl: cxSyncCloudBrowserUrl(), envPath: "CXSync Cloud .env", hasKey: true, key: body.key, keyPreview: body.keyPreview ?? `${body.key.slice(0, 6)}...${body.key.slice(-6)}`, updatedAt: body.updatedAt ?? new Date().toISOString() }
    /* c8 ignore next 2 -- retained only for older browser bundles during hot reload */
    const key = crypto.getRandomValues(new Uint8Array(32)).reduce((text, byte) => text + byte.toString(16).padStart(2, "0"), "")
    return { envPath: "Browser preview", hasKey: true, key, keyPreview: `${key.slice(0, 6)}…${key.slice(-6)}`, updatedAt: new Date().toISOString() }
  },
  async saveServiceKey(key) {
    sessionStorage.setItem(browserServiceKey, key.trim())
    return { envPath: "Browser preview", hasKey: Boolean(key), keyPreview: key ? `${key.slice(0, 6)}…${key.slice(-6)}` : null, updatedAt: new Date().toISOString() }
  },
  async saveCloudServiceUrl(url) {
    const normalized = normalizePreviewCloudUrl(url)
    const key = sessionStorage.getItem(browserServiceKey)?.trim() || ""
    localStorage.setItem(browserCloudUrlKey, normalized)
    return { cloudServiceUrl: normalized, envPath: "Browser session", hasKey: Boolean(key), keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-6)}` : null, updatedAt: new Date().toISOString() }
  },
  async getCloudServiceHandshake() {
    return null
  },
  async verifyCloudServiceHandshake() {
    return {
      apiUrl: readPreviewCloudUrl(),
      backend: { latencyMs: 0, message: "Electron desktop is required to verify backend API.", ok: false, statusCode: null },
      checkedAt: new Date().toISOString(),
      frontend: { latencyMs: 0, message: "Browser preview does not run desktop handshake.", ok: false, statusCode: null },
      latencyMs: 0,
      message: "Electron desktop is required to verify the cloud service handshake.",
      ok: false,
      service: "cxsync-cloud",
      status: "unreachable",
    }
  },
  async getTenantUpgradePlan() {
    return null
  },
  async generateTenantUpgradePlan() {
    return {
      baselineId: "preview",
      createdAt: new Date().toISOString(),
      diffSnapshotId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      status: "draft",
      steps: [],
      summary: { caution: 0, destructive: 0, safe: 0, total: 0 },
    }
  },
  async getTenantUpgradePreflight() {
    return null
  },
  async getTenantUpgradeExecution() {
    return null
  },
  async getTenantSyncJob() {
    return null
  },
  async listTenantSyncJobs() {
    return []
  },
  async checkTenantSyncService() {
    return { apiUrl: "Browser preview", checkedAt: new Date().toISOString(), latencyMs: 0, message: "Electron is required to check CXSync Cloud.", ok: false, service: "cxsync-cloud" }
  },
  async exportTenantSyncReport() {
    throw new Error("Electron is required to export sync reports.")
  },
  async runTenantUpgradePreflight() {
    return {
      checkedAt: new Date().toISOString(), checks: [], id: crypto.randomUUID(), planId: "preview", ready: false,
      summary: { blocked: 1, passed: 0, warnings: 0 },
    }
  },
  async executeTenantUpgrade() {
    throw new Error("Electron is required to execute tenant upgrades.")
  },
  async runTenantSyncJob() {
    throw new Error("Electron is required to run sync jobs.")
  },
  async continueTenantSyncJob() {
    throw new Error("Electron is required to continue sync jobs.")
  },
  async retryTenantSyncJob() {
    throw new Error("Electron is required to retry sync jobs.")
  },
  async createTenantBackup() {
    throw new Error("Electron is required to create tenant backups.")
  },
  async getTenantBackup() {
    return null
  },
  async getTenantSchemaBaseline(id) {
    return {
      baselineName: "Browser preview baseline",
      capturedAt: new Date().toISOString(),
      id,
      schemaHash: "preview",
      source: "local-inspection",
      totals: { columnCount: 0, dataLength: 0, indexCount: 0, indexLength: 0, missingPrimaryKeyCount: 0, rowsEstimate: 0, tableCount: 0 },
    }
  },
  async getCodebaseSchemaBuildStatus() {
    return {
      activity: [],
      database: null,
      elapsedMs: 0,
      error: null,
      message: "Electron is required to build the expected schema.",
      operation: null,
      phase: "idle",
      processState: null,
      recentOutput: null,
      recentTables: [],
      startedAt: null,
      tableCount: 0,
      updatedAt: new Date().toISOString(),
    }
  },
  async inspectTenantDatabase(id) {
    const record = readPreview().find((item) => item.id === id)
    return {
      capturedAt: new Date().toISOString(),
      columns: [],
      database: record?.localDatabase ?? "Browser preview",
      indexes: [],
      snapshotId: crypto.randomUUID(),
      tables: [],
      totals: { columnCount: 0, dataLength: 0, indexCount: 0, indexLength: 0, missingPrimaryKeyCount: 0, rowsEstimate: 0, tableCount: 0 },
    }
  },
  async listTenantHandshakeHistory(id) {
    const record = readPreview().find((item) => item.id === id)
    return record?.lastHandshake ? [{ ...record.lastHandshake, id: 1 }] : []
  },
  async listTenantConnections() {
    return readPreview()
  },
  async saveTenantConnection(input, id) {
    const records = readPreview()
    const current = records.find((item) => item.id === id)
    const now = new Date().toISOString()
    const record: TenantConnection = {
      ...input,
      createdAt: current?.createdAt ?? now,
      hasCloudPassword: Boolean(input.cloudAdminPassword || current?.hasCloudPassword),
      hasLocalPassword: Boolean(input.localPassword || current?.hasLocalPassword),
      id: current?.id ?? crypto.randomUUID(),
      lastHandshake: current?.lastHandshake ?? null,
      updatedAt: now,
    }
    delete (record as Partial<typeof input>).cloudAdminPassword
    delete (record as Partial<typeof input>).localPassword
    writePreview([record, ...records.filter((item) => item.id !== record.id)])
    return record
  },
  async captureTenantCloudSnapshot(id) {
    const record = readPreview().find((item) => item.id === id)
    return {
      apiUrl: record?.cloudApiUrl ?? "Browser preview",
      capturedAt: new Date().toISOString(),
      cloudVersion: "preview",
      domain: record?.cloudDomain ?? "preview",
      health: { latencyMs: 0, ok: false, status: "Electron required" },
      id: crypto.randomUUID(),
      message: "Electron is required to capture a real cloud snapshot.",
      schema: null,
      session: { latencyMs: 0, ok: false, selectedTenant: null, userEmail: null },
      status: "failed",
      tenantCode: record?.tenantCode ?? "preview",
    }
  },
  async verifyTenantConnection() {
    return {
      cloud: { latencyMs: 0, message: "Electron required.", ok: false, version: "unavailable" },
      local: { database: "Browser preview", latencyMs: 0, message: "Electron required.", ok: false, version: "unavailable" },
      verifiedAt: new Date().toISOString(),
      versionsMatch: false,
    }
  },
}

function readPreview(): TenantConnection[] {
  try {
    return JSON.parse(localStorage.getItem(browserKey) ?? "[]") as TenantConnection[]
  } catch {
    return []
  }
}

function writePreview(records: TenantConnection[]) {
  localStorage.setItem(browserKey, JSON.stringify(records))
}

function readPreviewCloudUrl() {
  return localStorage.getItem(browserCloudUrlKey) || defaultPreviewCloudUrl()
}

function defaultPreviewCloudUrl() {
  if (typeof __CXSYNC_CLOUD_PUBLIC_URL__ === "string" && __CXSYNC_CLOUD_PUBLIC_URL__.trim()) {
    return __CXSYNC_CLOUD_PUBLIC_URL__.trim().replace(/\/+$/, "")
  }
  if (window.location.port === "6077") return window.location.origin
  return ""
}

function normalizePreviewCloudUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  if (!normalized) throw new Error("Cloud service URL is required.")
  const parsed = new URL(normalized)
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Cloud service URL must start with http:// or https://.")
  return parsed.toString().replace(/\/+$/, "")
}
