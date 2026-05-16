import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const monthsCommonDefinition: MasterDataModuleDefinition = {
  key: 'months',
  label: 'Months',
  kind: 'common',
  tableName: 'common_months',
  idPrefix: 'month',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
