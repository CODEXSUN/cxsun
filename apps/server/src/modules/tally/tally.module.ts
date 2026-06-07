import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { TallyController } from './tally.controller.js'
import { TallyRepository } from './tally.repository.js'
import { TallyService } from './tally.service.js'

@Module({
  controllers: [TallyController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    TallyRepository,
    TallyService,
  ],
})
export class TallyModule {}
