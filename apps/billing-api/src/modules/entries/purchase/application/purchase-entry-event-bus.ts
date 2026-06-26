import { Inject } from '@cxsun/platform/core/decorators/inject.js'
import { Injectable } from '@cxsun/platform/core/decorators/injectable.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import type { PurchaseEntryDomainEvent } from '../domain/events/purchase-entry.events.js'

@Injectable()
export class PurchaseEntryEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: PurchaseEntryDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}

