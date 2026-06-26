import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const currenciesCommonDefinition: MasterDataModuleDefinition = {
  key: 'currencies',
  label: 'Currencies',
  kind: 'common',
  tableName: 'common_currencies',
  idPrefix: 'currency',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
