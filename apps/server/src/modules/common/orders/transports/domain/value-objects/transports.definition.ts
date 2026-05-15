import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const transportsCommonDefinition: MasterDataModuleDefinition = {
  key: 'transports',
  label: 'Transports',
  kind: 'common',
  tableName: 'common_transports',
  idPrefix: 'transport',
  group: 'orders',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
