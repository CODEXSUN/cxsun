import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const unitsCommonDefinition: MasterDataModuleDefinition = {
  key: 'units',
  label: 'Units',
  kind: 'common',
  tableName: 'common_units',
  idPrefix: 'unit',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
