import type { PurchaseEntry } from '../entities/purchase-entry.entity.js'
import { PurchaseEntryEvent } from '../events/purchase-entry.events.js'

export class PurchaseEntryAggregate {
  private constructor(
    private readonly entry: PurchaseEntry,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: PurchaseEntry, tenantId: number, actorEmail: string) {
    return new PurchaseEntryAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('entries.purchase.created')
  }

  updatedEvent() {
    return this.event('entries.purchase.updated')
  }

  deletedEvent() {
    return this.event('entries.purchase.deleted')
  }

  restoredEvent() {
    return this.event('entries.purchase.restored')
  }

  private event(name: Parameters<typeof PurchaseEntryEvent>[0]) {
    return PurchaseEntryEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { entryNo: this.entry.entry_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}

