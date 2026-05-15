import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const bankNamesCommonDefinition: MasterDataModuleDefinition = {
  key: 'bankNames',
  label: 'Bank Names',
  kind: 'common',
  tableName: 'common_bank_names',
  idPrefix: 'bank-name',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
