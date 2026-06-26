import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const prioritiesCommonDefinition: MasterDataModuleDefinition = {
  key: 'priorities',
  label: 'Priorities',
  kind: 'common',
  tableName: 'common_priorities',
  idPrefix: 'priority',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'colour', label: 'Colour', type: 'string', required: true, nullable: false },
    { key: 'tag', label: 'Tag', type: 'string', required: true, nullable: false },
  ],
}
