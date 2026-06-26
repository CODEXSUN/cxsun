import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const productGroupsCommonDefinition: MasterDataModuleDefinition = {
  key: 'productGroups',
  label: 'Product Groups',
  kind: 'common',
  tableName: 'common_product_groups',
  idPrefix: 'product-group',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
