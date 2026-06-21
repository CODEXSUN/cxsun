import type { CxSyncDesktopApi, TenantConnection } from "../../shared/connection-contracts"

const browserKey = "cxsync.preview.tenant-connections"

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
  async runTenantUpgradePreflight() {
    return {
      checkedAt: new Date().toISOString(), checks: [], id: crypto.randomUUID(), planId: "preview", ready: false,
      summary: { blocked: 1, passed: 0, warnings: 0 },
    }
  },
  async executeTenantUpgrade() {
    throw new Error("Electron is required to execute tenant upgrades.")
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
