export type PurchaseEntryEventName =
  | 'entries.purchase.created'
  | 'entries.purchase.updated'
  | 'entries.purchase.deleted'
  | 'entries.purchase.restored'
  | 'entries.purchase.commented'
  | 'entries.purchase.tool'

export interface PurchaseEntryDomainEvent {
  name: PurchaseEntryEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function PurchaseEntryEvent(
  name: PurchaseEntryEventName,
  input: Omit<PurchaseEntryDomainEvent, 'name' | 'occurredAt'>,
): PurchaseEntryDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

