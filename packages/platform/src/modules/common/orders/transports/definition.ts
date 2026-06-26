import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const transportsCommonDefinition: MasterDataModuleDefinition = {
  key: 'transports',
  label: 'Transports',
  kind: 'common',
  tableName: 'common_transports',
  idPrefix: 'transport',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'gst', label: 'GST', type: 'string', nullable: true },
    { key: 'vehicle_no', label: 'Vehicle no', type: 'string', nullable: true },
    { key: 'address', label: 'Address', type: 'string', nullable: true },
    { key: 'contact_no', label: 'Contact no', type: 'string', nullable: true },
    { key: 'contact_person', label: 'Contact person', type: 'string', nullable: true },
  ],
}
