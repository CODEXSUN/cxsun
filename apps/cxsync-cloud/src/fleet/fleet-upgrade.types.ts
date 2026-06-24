export type FleetBatchStatus = 'prepared' | 'cloning' | 'ready' | 'failed'
export type FleetItemStatus = 'pending' | 'cloning' | 'validated' | 'failed'

export interface FleetTenantInventoryItem {
  corporateId: string
  database: string
  databaseHost: string
  databaseType: string
  id: number
  name: string
  slug: string
  status: string
  tenantCode: string
}

export interface FleetUpgradeItem {
  candidateDatabase: string
  error: string | null
  id: string
  isCanary: boolean
  sequence: number
  sourceDatabase: string
  status: FleetItemStatus
  tenantCode: string
  tenantId: number
  tenantName: string
  tenantSlug: string
}

export interface FleetUpgradeBatch {
  completedAt: string | null
  createdAt: string
  failedCount: number
  id: string
  idempotencyKey: string
  items: FleetUpgradeItem[]
  maxParallel: 1
  readyCount: number
  releaseVersion: string
  startedAt: string | null
  status: FleetBatchStatus
  stopOnFailure: true
  strategy: 'blue-green-clone'
  targetCount: number
}

export interface PrepareFleetBatchInput {
  canaryTenantId?: unknown
  idempotencyKey?: unknown
  releaseVersion?: unknown
  tenantIds?: unknown
}

export interface FleetCloneEvidence {
  backupFile: string
  backupSha256: string
  candidateDatabase: string
  candidateSchemaHash: string
  candidateTableCount: number
  exactRowCount: number
  sourceDatabase: string
  sourceSchemaHash: string
  sourceTableCount: number
}
