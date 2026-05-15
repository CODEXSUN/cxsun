import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const stylesCommonDefinition: MasterDataModuleDefinition = {
  key: 'styles',
  label: 'Styles',
  kind: 'common',
  tableName: 'common_styles',
  idPrefix: 'style',
  group: 'product',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
