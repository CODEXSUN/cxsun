import type { MasterDataKind } from '../value-objects/master-data-definition.js'

export type MasterRecordEventName =
  | 'master-record.created'
  | 'master-record.updated'
  | 'master-record.deleted'
  | 'master-record.restored'

export interface MasterRecordDomainEvent {
  name: MasterRecordEventName
  moduleKey: string
  moduleKind: MasterDataKind
  recordId: number
  uuid: string
  occurredAt: string
}

export function masterRecordEvent(
  name: MasterRecordEventName,
  input: { moduleKey: string; moduleKind: MasterDataKind; recordId: number; uuid: string },
): MasterRecordDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

