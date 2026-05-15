import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const addressTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'addressTypes',
  label: 'Address Types',
  kind: 'common',
  tableName: 'common_address_types',
  idPrefix: 'address-type',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
