export type LocalAdminSession = {
  email: string
  name: string
  role: "super-admin"
}

export type LocalEnvironmentStatus = {
  appVersion: string
  database: string
  databaseServerVersion: string
  host: string
  ok: boolean
  port: number
  user: string
}

export type TenantConnectionInput = {
  cloudAdminEmail: string
  cloudAdminPassword: string
  cloudApiUrl: string
  cloudDomain: string
  corporateId: string
  localDatabase: string
  localHost: string
  localPassword: string
  localPort: number
  localUser: string
  tenantCode: string
  tenantName: string
}

export type TenantConnection = Omit<TenantConnectionInput, "cloudAdminPassword" | "localPassword"> & {
  createdAt: string
  hasCloudPassword: boolean
  hasLocalPassword: boolean
  id: string
  lastHandshake: TenantConnectionVerification | null
  updatedAt: string
}

export type TenantConnectionVerification = {
  cloud: {
    latencyMs: number
    message: string
    ok: boolean
    version: string
  }
  local: {
    database: string
    latencyMs: number
    message: string
    ok: boolean
    version: string
  }
  versionsMatch: boolean
  verifiedAt: string
}

export type TenantHandshakeHistoryItem = TenantConnectionVerification & {
  id: number
}

export type TenantCloudSnapshot = {
  apiUrl: string
  capturedAt: string
  cloudVersion: string
  domain: string
  health: {
    latencyMs: number
    ok: boolean
    status: string
  }
  id: string
  message: string
  session: {
    latencyMs: number
    ok: boolean
    selectedTenant: string | null
    userEmail: string | null
  }
  status: "ready" | "partial" | "failed"
  tenantCode: string
}

export type TenantTableInspectionItem = {
  collation: string
  columnCount: number
  dataLength: number
  engine: string
  hasPrimaryKey: boolean
  indexCount: number
  indexLength: number
  rowsEstimate: number
  tableName: string
  updatedAt: string | null
}

export type TenantColumnInspectionItem = {
  columnDefault: string | null
  columnName: string
  columnType: string
  extra: string
  isNullable: boolean
  ordinalPosition: number
  tableName: string
}

export type TenantIndexInspectionItem = {
  columnName: string
  indexName: string
  isUnique: boolean
  sequence: number
  tableName: string
}

export type TenantDatabaseInspection = {
  capturedAt: string
  columns: TenantColumnInspectionItem[]
  database: string
  indexes: TenantIndexInspectionItem[]
  snapshotId: string
  tables: TenantTableInspectionItem[]
  totals: {
    columnCount: number
    dataLength: number
    indexCount: number
    indexLength: number
    missingPrimaryKeyCount: number
    rowsEstimate: number
    tableCount: number
  }
}

export type TenantSchemaBaseline = {
  baselineName: string
  capturedAt: string
  id: string
  schemaHash: string
  source: "local-inspection" | "codebase" | "cloud"
  totals: TenantDatabaseInspection["totals"]
}

export type TenantSchemaDiffItem = {
  actual?: string
  expected?: string
  message: string
  objectName: string
  objectType: "table" | "column" | "index" | "primary-key"
  severity: "info" | "warning" | "critical"
  status: "missing" | "extra" | "changed"
}

export type TenantSchemaDiffResult = {
  baseline: TenantSchemaBaseline | null
  comparedAt: string
  currentSnapshotId: string
  diffSnapshotId: string
  items: TenantSchemaDiffItem[]
  summary: {
    changed: number
    critical: number
    extra: number
    missing: number
    total: number
    warnings: number
  }
}

export type TenantSchemaBuildStatus = {
  activity: string[]
  database: string | null
  elapsedMs: number
  error: string | null
  message: string
  operation: string | null
  phase: "idle" | "preparing" | "migrating" | "inspecting" | "cleanup" | "completed" | "failed"
  processState: string | null
  recentOutput: string | null
  recentTables: string[]
  startedAt: string | null
  tableCount: number
  updatedAt: string
}

export type TenantUpgradePlanStep = {
  action: "create" | "alter" | "review" | "remove"
  id: string
  objectName: string
  objectType: TenantSchemaDiffItem["objectType"]
  order: number
  rationale: string
  risk: "safe" | "caution" | "destructive"
  statement: string | null
  title: string
}

export type TenantUpgradePlan = {
  baselineId: string
  createdAt: string
  diffSnapshotId: string
  id: string
  status: "draft"
  steps: TenantUpgradePlanStep[]
  summary: {
    caution: number
    destructive: number
    safe: number
    total: number
  }
}

export type TenantUpgradePreflightCheck = {
  detail: string
  id: string
  label: string
  status: "pass" | "warning" | "blocked"
}

export type TenantUpgradePreflight = {
  checkedAt: string
  checks: TenantUpgradePreflightCheck[]
  id: string
  planId: string
  ready: boolean
  summary: {
    blocked: number
    passed: number
    warnings: number
  }
}

export type TenantBackupRecord = {
  createdAt: string
  database: string
  fileName: string
  id: string
  planId: string
  restoreDatabase: string | null
  restoreVerifiedAt: string | null
  schemaHash: string | null
  sha256: string
  sizeBytes: number
  status: "restore-verified" | "verified" | "failed"
  tableCount: number
}

export type TenantUpgradeExecutionStep = {
  detail: string
  durationMs: number
  error: string | null
  finishedAt: string | null
  id: string
  objectName: string
  order: number
  startedAt: string | null
  status: "pending" | "running" | "applied" | "skipped" | "failed"
  title: string
}

export type TenantUpgradeExecution = {
  backupId: string
  completedAt: string | null
  id: string
  planId: string
  preflightId: string
  startedAt: string
  status: "blocked" | "running" | "completed" | "completed-with-skips" | "failed"
  steps: TenantUpgradeExecutionStep[]
  summary: {
    applied: number
    failed: number
    skipped: number
    total: number
  }
}

export type CxSyncDesktopApi = {
  isDesktop: boolean
  authenticateLocalAdmin(email: string, password: string): Promise<LocalAdminSession>
  captureCodebaseSchemaBaseline(id: string): Promise<TenantSchemaBaseline>
  captureTenantSchemaBaseline(id: string): Promise<TenantSchemaBaseline>
  compareTenantSchema(id: string): Promise<TenantSchemaDiffResult>
  deleteTenantConnection(id: string): Promise<void>
  getLocalEnvironmentStatus(): Promise<LocalEnvironmentStatus>
  getTenantSchemaBaseline(id: string): Promise<TenantSchemaBaseline | null>
  getCodebaseSchemaBuildStatus(id: string): Promise<TenantSchemaBuildStatus>
  getTenantConnection(id: string): Promise<TenantConnection | null>
  getTenantCloudSnapshot(id: string): Promise<TenantCloudSnapshot | null>
  getTenantUpgradePlan(id: string): Promise<TenantUpgradePlan | null>
  getTenantUpgradePreflight(id: string): Promise<TenantUpgradePreflight | null>
  getTenantUpgradeExecution(id: string): Promise<TenantUpgradeExecution | null>
  generateTenantUpgradePlan(id: string): Promise<TenantUpgradePlan>
  createTenantBackup(id: string): Promise<TenantBackupRecord>
  getTenantBackup(id: string): Promise<TenantBackupRecord | null>
  executeTenantUpgrade(id: string): Promise<TenantUpgradeExecution>
  runTenantUpgradePreflight(id: string): Promise<TenantUpgradePreflight>
  inspectTenantDatabase(id: string): Promise<TenantDatabaseInspection>
  listTenantHandshakeHistory(id: string): Promise<TenantHandshakeHistoryItem[]>
  listTenantConnections(): Promise<TenantConnection[]>
  saveTenantConnection(input: TenantConnectionInput, id?: string): Promise<TenantConnection>
  captureTenantCloudSnapshot(id: string): Promise<TenantCloudSnapshot>
  verifyTenantConnection(id: string): Promise<TenantConnectionVerification>
}
