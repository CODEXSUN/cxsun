export interface CxSyncTenantTableSnapshot {
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

export interface CxSyncTenantColumnSnapshot {
  columnDefault: string | null
  columnName: string
  columnType: string
  extra: string
  isNullable: boolean
  ordinalPosition: number
  tableName: string
}

export interface CxSyncTenantIndexSnapshot {
  columnName: string
  indexName: string
  isUnique: boolean
  sequence: number
  tableName: string
}

export interface CxSyncTenantSnapshot {
  capturedAt: string
  database: string
  schemaHash: string
  tenant: {
    code: number
    corporateId: string | null
    name: string
    slug: string
  }
  totals: {
    columnCount: number
    dataLength: number
    indexCount: number
    indexLength: number
    missingPrimaryKeyCount: number
    rowsEstimate: number
    tableCount: number
  }
  tables: CxSyncTenantTableSnapshot[]
  columns: CxSyncTenantColumnSnapshot[]
  indexes: CxSyncTenantIndexSnapshot[]
}
