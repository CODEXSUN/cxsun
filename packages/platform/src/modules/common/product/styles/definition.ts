import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const stylesCommonDefinition: MasterDataModuleDefinition = {
  key: 'styles',
  label: 'Styles',
  kind: 'common',
  tableName: 'common_styles',
  idPrefix: 'style',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
