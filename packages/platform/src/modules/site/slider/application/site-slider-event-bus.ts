import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import type { SiteSliderDomainEvent } from '../domain/events/site-slider.events.js'

@Injectable()
export class SiteSliderEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: SiteSliderDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: {
        tenantId: event.tenantId,
        sliderUuid: event.sliderUuid,
        occurredAt: event.occurredAt,
      },
    })
  }
}
