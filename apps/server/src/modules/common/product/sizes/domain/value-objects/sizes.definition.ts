import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const sizesCommonDefinition: MasterDataModuleDefinition = {
  key: 'sizes',
  label: 'Sizes',
  kind: 'common',
  tableName: 'common_sizes',
  idPrefix: 'size',
  group: 'product',
  defaultSortKey: 'sort_order',
  columns: [...codeNameDescription, { key: 'sort_order', label: 'Sort Order', type: 'number', numberMode: 'integer' }],
}
