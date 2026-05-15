import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const taxesCommonDefinition: MasterDataModuleDefinition = {
  key: 'taxes',
  label: 'Taxes',
  kind: 'common',
  tableName: 'common_taxes',
  idPrefix: 'tax',
  group: 'product',
  defaultSortKey: 'rate_percent',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'tax_type', label: 'Tax Type', type: 'string', required: true, nullable: false },
    { key: 'rate_percent', label: 'Rate Percent', type: 'number', numberMode: 'decimal', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
