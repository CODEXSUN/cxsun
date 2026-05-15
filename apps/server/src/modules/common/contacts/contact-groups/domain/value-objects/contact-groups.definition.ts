import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const contactGroupsCommonDefinition: MasterDataModuleDefinition = {
  key: 'contactGroups',
  label: 'Contact Groups',
  kind: 'common',
  tableName: 'common_contact_groups',
  idPrefix: 'contact-group',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
