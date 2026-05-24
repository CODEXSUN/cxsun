import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
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
