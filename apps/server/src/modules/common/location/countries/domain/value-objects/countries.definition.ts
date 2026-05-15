import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const countriesCommonDefinition: MasterDataModuleDefinition = {
  key: 'countries',
  label: 'Countries',
  kind: 'common',
  tableName: 'common_countries',
  idPrefix: 'country',
  group: 'location',
  defaultSortKey: 'name',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'phone_code', label: 'Phone Code', type: 'string', nullable: true },
  ],
}
