import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { SubscriptionController } from './subscription.controller.js'
import { SubscriptionService } from './subscription.service.js'

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, TenantContextService],
})
export class SubscriptionModule {}
