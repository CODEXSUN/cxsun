import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const bankNamesCommonDefinition: MasterDataModuleDefinition = {
  key: 'bankNames',
  label: 'Bank Names',
  kind: 'common',
  tableName: 'common_bank_names',
  idPrefix: 'bank-name',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
