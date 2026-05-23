export type MasterDataKind = "common" | "master"
export type MasterDataColumnType = "string" | "number" | "boolean" | "date"

export interface MasterDataColumnDefinition {
  key: string
  label: string
  type: MasterDataColumnType
  required?: boolean
  nullable?: boolean
  numberMode?: "integer" | "decimal"
}

export interface MasterDataModuleDefinition {
  key: string
  label: string
  kind: MasterDataKind
  tableName: string
  defaultSortKey: string
  idPrefix: string
  group: string
  columns: MasterDataColumnDefinition[]
}

export interface MasterDataRecord {
  id: number
  uuid: string
  is_active: boolean | number
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  [key: string]: unknown
}

export type MasterDataUpsertInput = Record<string, unknown> & {
  id?: number
  uuid?: string
  is_active?: boolean
}
