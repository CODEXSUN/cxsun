import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const orderTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'orderTypes',
  label: 'Order Types',
  kind: 'common',
  tableName: 'common_order_types',
  idPrefix: 'order-type',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
