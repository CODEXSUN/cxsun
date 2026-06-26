import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const destinationsCommonDefinition: MasterDataModuleDefinition = {
  key: 'destinations',
  label: 'Destinations',
  kind: 'common',
  tableName: 'common_destinations',
  idPrefix: 'destination',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
