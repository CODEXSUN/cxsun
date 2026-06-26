import { Module } from '@cxsun/platform/core/decorators/module.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '@cxsun/platform/modules/auth/infrastructure/auth.repository.js'
import { TenantRepository } from '@cxsun/platform/core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '@cxsun/platform/core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DeliveryNoteEventBus } from './application/delivery-note-event-bus.js'
import { DeliveryNoteService } from './application/delivery-note.service.js'
import { DeliveryNoteRepository } from './infrastructure/persistence/delivery-note.repository.js'
import { DeliveryNoteV1Controller } from './interface/http/delivery-note-v1.controller.js'
import { DocumentNumberRepository } from '@cxsun/platform/modules/settings/document-settings/infrastructure/document-number.repository.js'

@Module({
  controllers: [DeliveryNoteV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    DeliveryNoteEventBus,
    DocumentNumberRepository,
    DeliveryNoteRepository,
    DeliveryNoteService,
  ],
})
export class DeliveryNoteModule {}

