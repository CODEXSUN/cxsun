import type { MasterDataModuleDefinition } from '../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const contactMasterDefinition: MasterDataModuleDefinition = {
  key: 'contacts',
  label: 'Contacts',
  kind: 'master',
  tableName: 'masters_contacts',
  defaultSortKey: 'name',
  idPrefix: 'contact',
  group: 'contacts',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
