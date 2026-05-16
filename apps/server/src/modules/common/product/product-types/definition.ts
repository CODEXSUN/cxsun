import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const productTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'productTypes',
  label: 'Product Types',
  kind: 'common',
  tableName: 'common_product_types',
  idPrefix: 'product-type',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
