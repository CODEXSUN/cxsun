import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const sizesCommonDefinition: MasterDataModuleDefinition = {
  key: 'sizes',
  label: 'Sizes',
  kind: 'common',
  tableName: 'common_sizes',
  idPrefix: 'size',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
