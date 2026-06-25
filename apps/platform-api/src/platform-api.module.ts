import 'reflect-metadata'
import { Module } from '../../server/src/core/decorators/module.js'
import { AuthAnyGuard } from '../../server/src/core/guards/auth-any.guard.js'
import { AuthGuard } from '../../server/src/core/guards/auth.guard.js'
import { HealthModule } from '../../server/src/core/health/health.module.js'
import { IndustryModule } from '../../server/src/core/industry/industry.module.js'
import { TenantDomainModule } from '../../server/src/core/tenant-domain/tenant-domain.module.js'
import { TenantModule } from '../../server/src/core/tenant/tenant.module.js'
import { AuthModule } from '../../server/src/modules/auth/auth.module.js'

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    IndustryModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class PlatformApiModule {}
