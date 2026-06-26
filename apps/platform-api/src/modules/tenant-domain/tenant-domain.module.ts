import { Module } from '../.././core/decorators/module.js'
import { PlatformEventBus } from '../../events.js'
import { DomainResolutionEngine } from './domain-resolution.engine.js'
import { TenantDomainRepository } from './tenant-domain.repository.js'
import { TenantDomainService } from './tenant-domain.service.js'
import { TenantDomainsV1Controller } from './tenant-domains-v1.controller.js'

@Module({
  controllers: [TenantDomainsV1Controller],
  providers: [DomainResolutionEngine, TenantDomainService, TenantDomainRepository, PlatformEventBus],
})
export class TenantDomainModule {}
