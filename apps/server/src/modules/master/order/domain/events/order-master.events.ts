export type OrderMasterEventName =
  | 'order-master.created'
  | 'order-master.updated'
  | 'order-master.deleted'
  | 'order-master.restored'

export interface OrderMasterDomainEvent {
  name: OrderMasterEventName
  recordId: number
  uuid: string
  occurredAt: string
}

