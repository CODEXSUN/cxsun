import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const stockRejectionTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'stockRejectionTypes',
  label: 'Stock Rejection Types',
  kind: 'common',
  tableName: 'common_stock_rejection_types',
  idPrefix: 'stock-rejection-type',
  group: 'orders',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
