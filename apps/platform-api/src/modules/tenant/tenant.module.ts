import 'reflect-metadata'
import { Module } from '../.././core/decorators/module.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { PlatformEventBus } from '../../events.js'
import { TenantEventLog } from './tenant-event-log.js'
import { TenantRepository } from './tenant.repository.js'
import { TenantService } from './tenant.service.js'
import { TenantsV1Controller } from './tenants-v1.controller.js'

@Module({
  controllers: [TenantsV1Controller],
  providers: [TenantService, TenantRepository, TenantEventLog, PlatformEventBus, MasterQueueService],
})
export class TenantModule {}
