export type ContactMasterEventName =
  | 'contact-master.created'
  | 'contact-master.updated'
  | 'contact-master.deleted'
  | 'contact-master.restored'

export interface ContactMasterDomainEvent {
  name: ContactMasterEventName
  recordId: number
  uuid: string
  occurredAt: string
}

export function contactMasterEvent(
  name: ContactMasterEventName,
  input: { recordId: number; uuid: string },
): ContactMasterDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

