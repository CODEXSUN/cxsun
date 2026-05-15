import type { MasterDataModuleDefinition } from '../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const productMasterDefinition: MasterDataModuleDefinition = {
  key: 'products',
  label: 'Products',
  kind: 'master',
  tableName: 'masters_products',
  defaultSortKey: 'name',
  idPrefix: 'product',
  group: 'product',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
