import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../../infrastructure/queue/master-queue.service.js'
import type { MasterRecordDomainEvent } from '../../domain/events/master-record.events.js'

@Injectable()
export class MasterRecordEventBus {
  private readonly events: MasterRecordDomainEvent[] = []

  constructor(
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async publish(event: MasterRecordDomainEvent) {
    this.events.unshift(event)

    if (this.events.length > 100) {
      this.events.length = 100
    }

    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })

    console.info(`[master-data:event] ${event.name} ${event.moduleKey}:${event.uuid}`)
  }

  recent() {
    return [...this.events]
  }
}
