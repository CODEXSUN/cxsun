import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const paymentTermsCommonDefinition: MasterDataModuleDefinition = {
  key: 'paymentTerms',
  label: 'Payment Terms',
  kind: 'common',
  tableName: 'common_payment_terms',
  idPrefix: 'payment-term',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  ],
}
