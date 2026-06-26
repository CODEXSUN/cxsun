import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const coloursCommonDefinition: MasterDataModuleDefinition = {
  key: 'colours',
  label: 'Colours',
  kind: 'common',
  tableName: 'common_colours',
  idPrefix: 'colour',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
