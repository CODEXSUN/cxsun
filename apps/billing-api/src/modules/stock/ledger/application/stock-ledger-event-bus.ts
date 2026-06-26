import { Inject } from '@cxsun/platform/core/decorators/inject.js'
import { Injectable } from '@cxsun/platform/core/decorators/injectable.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import type { StockLedgerDomainEvent } from '../domain/events/stock-ledger.events.js'

@Injectable()
export class StockLedgerEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: StockLedgerDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}
