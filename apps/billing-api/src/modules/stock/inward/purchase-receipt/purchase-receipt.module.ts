import { Module } from '@cxsun/platform/core/decorators/module.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '@cxsun/platform/modules/auth/infrastructure/auth.repository.js'
import { TenantRepository } from '@cxsun/platform/core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '@cxsun/platform/core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { PurchaseReceiptEventBus } from './application/purchase-receipt-event-bus.js'
import { PurchaseReceiptService } from './application/purchase-receipt.service.js'
import { PurchaseReceiptRepository } from './infrastructure/persistence/purchase-receipt.repository.js'
import { PurchaseReceiptV1Controller } from './interface/http/purchase-receipt-v1.controller.js'
import { DocumentNumberRepository } from '@cxsun/platform/modules/settings/document-settings/infrastructure/document-number.repository.js'

@Module({
  controllers: [PurchaseReceiptV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    PurchaseReceiptEventBus,
    DocumentNumberRepository,
    PurchaseReceiptRepository,
    PurchaseReceiptService,
  ],
})
export class PurchaseReceiptModule {}

