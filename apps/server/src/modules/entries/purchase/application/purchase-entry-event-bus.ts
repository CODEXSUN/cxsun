import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
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

