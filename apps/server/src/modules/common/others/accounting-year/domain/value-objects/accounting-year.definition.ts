import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const accountingYearCommonDefinition: MasterDataModuleDefinition = {
  key: 'accountingYear',
  label: 'Accounting Year',
  kind: 'common',
  tableName: 'accounting_years',
  idPrefix: 'accounting-year',
  group: 'others',
  defaultSortKey: 'start_date',
  columns: [
    { key: 'name', label: 'Accounting Year', type: 'string', required: true, nullable: false },
    { key: 'start_date', label: 'Start Date', type: 'string', required: true, nullable: false },
    { key: 'end_date', label: 'End Date', type: 'string', required: true, nullable: false },
    { key: 'books_start', label: 'Books Start', type: 'string', nullable: true },
  ],
}
