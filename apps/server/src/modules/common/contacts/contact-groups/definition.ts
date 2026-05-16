import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const contactGroupsCommonDefinition: MasterDataModuleDefinition = {
  key: 'contactGroups',
  label: 'Contact Groups',
  kind: 'common',
  tableName: 'common_contact_groups',
  idPrefix: 'contact-group',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
