import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const hsnCodesCommonDefinition: MasterDataModuleDefinition = {
  key: 'hsnCodes',
  label: 'HSN Codes',
  kind: 'common',
  tableName: 'common_hsn_codes',
  idPrefix: 'hsn',
  group: 'product',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
