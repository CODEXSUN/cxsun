import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const taxesCommonDefinition: MasterDataModuleDefinition = {
  key: 'taxes',
  label: 'Taxes',
  kind: 'common',
  tableName: 'common_taxes',
  idPrefix: 'tax',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
