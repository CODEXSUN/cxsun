import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const brandsCommonDefinition: MasterDataModuleDefinition = {
  key: 'brands',
  label: 'Brands',
  kind: 'common',
  tableName: 'common_brands',
  idPrefix: 'brand',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
