import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const stockRejectionTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'stockRejectionTypes',
  label: 'Stock Rejection Types',
  kind: 'common',
  tableName: 'common_stock_rejection_types',
  idPrefix: 'stock-rejection-type',
  group: 'orders',
  defaultSortKey: 'name',
  columns: codeNameDescription,
}
