import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const statesCommonDefinition: MasterDataModuleDefinition = {
  key: 'states',
  label: 'States',
  kind: 'common',
  tableName: 'common_states',
  idPrefix: 'state',
  group: 'location',
  defaultSortKey: 'name',
  columns: [
    { key: 'country_id', label: 'Country', type: 'number', numberMode: 'integer', required: true, nullable: false },
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
