import 'reflect-metadata'
import { Module } from '@cxsun/platform/core/decorators/module.js'
import { AuthAnyGuard } from '@cxsun/platform/core/guards/auth-any.guard.js'
import { AuthGuard } from '@cxsun/platform/core/guards/auth.guard.js'
import { HealthModule } from '@cxsun/platform/core/health/health.module.js'
import { AuthModule } from '@cxsun/platform/modules/auth/auth.module.js'
import { SiteModule } from '@cxsun/platform/modules/site/index.js'

@Module({
  imports: [HealthModule, AuthModule, SiteModule],
  guards: [AuthGuard, AuthAnyGuard],
})
export class SitesApiModule {}
