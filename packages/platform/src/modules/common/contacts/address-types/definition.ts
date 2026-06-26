import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const addressTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'addressTypes',
  label: 'Address Types',
  kind: 'common',
  tableName: 'common_address_types',
  idPrefix: 'address-type',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
