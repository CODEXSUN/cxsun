import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const currenciesCommonDefinition: MasterDataModuleDefinition = {
  key: 'currencies',
  label: 'Currencies',
  kind: 'common',
  tableName: 'common_currencies',
  idPrefix: 'currency',
  group: 'others',
  defaultSortKey: 'code',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'symbol', label: 'Symbol', type: 'string', required: true, nullable: false },
    { key: 'decimal_places', label: 'Decimal Places', type: 'number', numberMode: 'integer' },
  ],
}
