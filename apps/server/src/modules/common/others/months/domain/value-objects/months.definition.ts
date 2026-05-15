import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const monthsCommonDefinition: MasterDataModuleDefinition = {
  key: 'months',
  label: 'Months',
  kind: 'common',
  tableName: 'common_months',
  idPrefix: 'month',
  group: 'others',
  defaultSortKey: 'start_date',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'start_date', label: 'Start Date', type: 'string', required: true, nullable: false },
    { key: 'end_date', label: 'End Date', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
