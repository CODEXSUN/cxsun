import 'reflect-metadata'
import { Module } from '@cxsun/platform/core/decorators/module.js'
import { AuthAnyGuard } from '@cxsun/platform/core/guards/auth-any.guard.js'
import { AuthGuard } from '@cxsun/platform/core/guards/auth.guard.js'
import { HealthModule } from '@cxsun/platform/core/health/health.module.js'
import { TenantModule } from '@cxsun/platform/core/tenant/tenant.module.js'
import { TenantDomainModule } from '@cxsun/platform/core/tenant-domain/tenant-domain.module.js'
import { AuthModule } from '@cxsun/platform/modules/auth/auth.module.js'
import { commonModuleClasses } from '@cxsun/platform/modules/common/index.js'
import { EcommerceModule } from '@cxsun/platform/modules/ecommerce/index.js'
import { MasterDataModule } from '@cxsun/platform/modules/foundation/master-data/index.js'
import { ContactsModule } from '@cxsun/platform/modules/master/contact/index.js'
import { ProductsModule } from '@cxsun/platform/modules/master/product/index.js'

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    ...commonModuleClasses,
    MasterDataModule,
    ContactsModule,
    ProductsModule,
    EcommerceModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class EcommerceApiModule {}
