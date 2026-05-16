import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const accountingYearCommonDefinition: MasterDataModuleDefinition = {
  key: 'accountingYear',
  label: 'Accounting Year',
  kind: 'common',
  tableName: 'accounting_years',
  idPrefix: 'accounting-year',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
