import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const productCategoriesCommonDefinition: MasterDataModuleDefinition = {
  key: 'productCategories',
  label: 'Product Categories',
  kind: 'common',
  tableName: 'common_product_categories',
  idPrefix: 'product-category',
  group: 'product',
  defaultSortKey: 'position_order',
  columns: [
    ...codeNameDescription,
    { key: 'image', label: 'Image', type: 'string', nullable: true },
    { key: 'position_order', label: 'Position Order', type: 'number', numberMode: 'integer' },
    { key: 'show_on_storefront_top_menu', label: 'Show On Storefront Top Menu', type: 'boolean' },
    { key: 'show_on_storefront_catalog', label: 'Show On Storefront Catalog', type: 'boolean' },
  ],
}
