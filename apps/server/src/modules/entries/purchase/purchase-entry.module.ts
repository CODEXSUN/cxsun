import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { PurchaseEntryEventBus } from './application/purchase-entry-event-bus.js'
import { PurchaseEntryService } from './application/purchase-entry.service.js'
import { PurchaseEntryRepository } from './infrastructure/persistence/purchase-entry.repository.js'
import { PurchaseEntryV1Controller } from './interface/http/purchase-entry-v1.controller.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'

@Module({
  controllers: [PurchaseEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    PurchaseEntryEventBus,
    DocumentNumberRepository,
    PurchaseEntryRepository,
    PurchaseEntryService,
  ],
})
export class PurchaseEntryModule {}

