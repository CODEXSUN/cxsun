import type { MasterRecord } from '../entities/master-record.entity.js'
import { masterRecordEvent } from '../events/master-record.events.js'
import type { MasterDataModuleDefinition } from '../value-objects/master-data-definition.js'

export class MasterRecordAggregate {
  private constructor(
    private readonly definition: MasterDataModuleDefinition,
    private readonly record: MasterRecord,
  ) {}

  static fromRecord(definition: MasterDataModuleDefinition, record: MasterRecord) {
    return new MasterRecordAggregate(definition, record)
  }

  createdEvent() {
    return masterRecordEvent('master-record.created', this.eventPayload())
  }

  updatedEvent() {
    return masterRecordEvent('master-record.updated', this.eventPayload())
  }

  deletedEvent() {
    return masterRecordEvent('master-record.deleted', this.eventPayload())
  }

  restoredEvent() {
    return masterRecordEvent('master-record.restored', this.eventPayload())
  }

  private eventPayload() {
    return {
      moduleKey: this.definition.key,
      moduleKind: this.definition.kind,
      recordId: this.record.id,
      uuid: this.record.uuid,
    }
  }
}

