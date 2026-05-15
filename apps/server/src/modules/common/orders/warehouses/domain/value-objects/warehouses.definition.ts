import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const warehousesCommonDefinition: MasterDataModuleDefinition = {
  key: 'warehouses',
  label: 'Warehouses',
  kind: 'common',
  tableName: 'common_warehouses',
  idPrefix: 'warehouse',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'is_default_location', label: 'Default Location', type: 'boolean' },
    { key: 'country', label: 'Country', type: 'string', nullable: true },
    { key: 'state', label: 'State', type: 'string', nullable: true },
    { key: 'district', label: 'District', type: 'string', nullable: true },
    { key: 'city', label: 'City', type: 'string', nullable: true },
    { key: 'pincode', label: 'Pincode', type: 'string', nullable: true },
    { key: 'address_line1', label: 'Address Line 1', type: 'string', nullable: true },
    { key: 'address_line2', label: 'Address Line 2', type: 'string', nullable: true },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
