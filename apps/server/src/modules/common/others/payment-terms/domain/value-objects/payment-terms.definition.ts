import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const codeNameDescription: MasterDataColumnDefinition[] = [
  { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
  { key: 'description', label: 'Description', type: 'string', nullable: true },
]

export const paymentTermsCommonDefinition: MasterDataModuleDefinition = {
  key: 'paymentTerms',
  label: 'Payment Terms',
  kind: 'common',
  tableName: 'common_payment_terms',
  idPrefix: 'payment-term',
  group: 'others',
  defaultSortKey: 'name',
  columns: [...codeNameDescription, { key: 'due_days', label: 'Due Days', type: 'number', numberMode: 'integer' }],
}
