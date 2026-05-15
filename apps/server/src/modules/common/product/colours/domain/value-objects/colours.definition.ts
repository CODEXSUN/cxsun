import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const coloursCommonDefinition: MasterDataModuleDefinition = {
  key: 'colours',
  label: 'Colours',
  kind: 'common',
  tableName: 'common_colours',
  idPrefix: 'colour',
  group: 'product',
  defaultSortKey: 'name',
  columns: [...codeNameDescription, { key: 'hex_code', label: 'Hex Code', type: 'string', nullable: true }],
}
