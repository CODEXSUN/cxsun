import 'reflect-metadata'
import { Module } from './core/decorators/module.js'
import { AuthAnyGuard } from './core/guards/auth-any.guard.js'
import { AuthGuard } from './core/guards/auth.guard.js'
import { AppRuntimeModule } from '@cxsun/platform/core/system/app-runtime/app-runtime.module.js'
import { AuthAnyGuard as SharedAuthAnyGuard } from '@cxsun/platform/core/guards/auth-any.guard.js'
import { AuthGuard as SharedAuthGuard } from '@cxsun/platform/core/guards/auth.guard.js'
import { AppSetupModule } from '@cxsun/platform/framework/setup/app-setup/index.js'
import { MediaModule } from '@cxsun/platform/modules/media/index.js'
import { SubscriptionModule } from '@cxsun/platform/modules/subscription/index.js'
import { AuthModule } from './modules/auth/index.js'
import { PlatformHealthModule } from './modules/health/index.js'
import { IndustryModule } from './modules/industry/index.js'
import { PlatformFoundationModule } from './modules/platform-foundation/index.js'
import { TenantModule } from './modules/tenant/index.js'
import { TenantDomainModule } from './modules/tenant-domain/index.js'

@Module({
  imports: [
    PlatformHealthModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    IndustryModule,
    PlatformFoundationModule,
    SubscriptionModule,
    AppSetupModule,
    AppRuntimeModule,
    MediaModule,
  ],
  guards: [AuthGuard, AuthAnyGuard, SharedAuthGuard, SharedAuthAnyGuard],
})
export class PlatformApiModule {}
