import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const productTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'productTypes',
  label: 'Product Types',
  kind: 'common',
  tableName: 'common_product_types',
  idPrefix: 'product-type',
  group: 'product',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
