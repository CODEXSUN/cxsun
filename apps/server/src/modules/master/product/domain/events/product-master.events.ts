export type ProductMasterEventName =
  | 'product-master.created'
  | 'product-master.updated'
  | 'product-master.deleted'
  | 'product-master.restored'

export interface ProductMasterDomainEvent {
  name: ProductMasterEventName
  recordId: number
  uuid: string
  occurredAt: string
}

export function productMasterEvent(
  name: ProductMasterEventName,
  input: { recordId: number; uuid: string },
): ProductMasterDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

