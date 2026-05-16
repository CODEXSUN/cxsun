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
  ],
}
