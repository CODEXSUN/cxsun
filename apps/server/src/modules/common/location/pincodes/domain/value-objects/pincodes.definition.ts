import type { MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const pincodesCommonDefinition: MasterDataModuleDefinition = {
  key: 'pincodes',
  label: 'Pincodes',
  kind: 'common',
  tableName: 'common_pincodes',
  idPrefix: 'pincode',
  group: 'location',
  defaultSortKey: 'code',
  columns: [
    { key: 'country_id', label: 'Country', type: 'number', numberMode: 'integer', required: true, nullable: false },
    { key: 'state_id', label: 'State', type: 'number', numberMode: 'integer', required: true, nullable: false },
    { key: 'district_id', label: 'District', type: 'number', numberMode: 'integer', required: true, nullable: false },
    { key: 'city_id', label: 'City', type: 'number', numberMode: 'integer', required: true, nullable: false },
    { key: 'code', label: 'Pincode', type: 'string', required: true, nullable: false },
    { key: 'area_name', label: 'Area Name', type: 'string', nullable: true },
  ],
}
