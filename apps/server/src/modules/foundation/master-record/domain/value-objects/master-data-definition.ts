export type MasterDataKind = 'common' | 'master'
export type MasterDataColumnType = 'string' | 'number' | 'boolean'

export interface MasterDataColumnDefinition {
  key: string
  label: string
  type: MasterDataColumnType
  required?: boolean
  nullable?: boolean
  numberMode?: 'integer' | 'decimal'
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
