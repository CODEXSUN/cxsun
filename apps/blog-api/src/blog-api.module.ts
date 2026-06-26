import 'reflect-metadata'
import { Module } from '@cxsun/platform/core/decorators/module.js'
import { AuthAnyGuard } from '@cxsun/platform/core/guards/auth-any.guard.js'
import { AuthGuard } from '@cxsun/platform/core/guards/auth.guard.js'
import { HealthModule } from '@cxsun/platform/core/health/health.module.js'
import { TenantModule } from '@cxsun/platform/core/tenant/tenant.module.js'
import { TenantDomainModule } from '@cxsun/platform/core/tenant-domain/tenant-domain.module.js'
import { AuthModule } from '@cxsun/platform/modules/auth/auth.module.js'
import { BlogModule } from '@cxsun/platform/modules/blog/index.js'

@Module({
  imports: [HealthModule, AuthModule, TenantModule, TenantDomainModule, BlogModule],
  guards: [AuthGuard, AuthAnyGuard],
})
export class BlogApiModule {}
