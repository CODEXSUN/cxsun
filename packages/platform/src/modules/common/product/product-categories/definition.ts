import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const productCategoriesCommonDefinition: MasterDataModuleDefinition = {
  key: 'productCategories',
  label: 'Product Categories',
  kind: 'common',
  tableName: 'common_product_categories',
  idPrefix: 'product-category',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
