import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const contactTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'contactTypes',
  label: 'Contact Types',
  kind: 'common',
  tableName: 'common_contact_types',
  idPrefix: 'contact-type',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
