import { Inject } from '@cxsun/platform/core/decorators/inject.js'
import { Injectable } from '@cxsun/platform/core/decorators/injectable.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import type { ExportSalesEntryDomainEvent } from '../domain/events/export-sales-entry.events.js'

@Injectable()
export class ExportSalesEntryEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: ExportSalesEntryDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}




