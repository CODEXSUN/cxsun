import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const warehousesCommonDefinition: MasterDataModuleDefinition = {
  key: 'warehouses',
  label: 'Warehouses',
  kind: 'common',
  tableName: 'common_warehouses',
  idPrefix: 'warehouse',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
