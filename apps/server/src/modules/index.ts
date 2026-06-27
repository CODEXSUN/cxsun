import { AuthModule } from './auth/auth.module.js'
import { CompanyModule } from './master/company/company.module.js'
import { commonModuleClasses } from './common/index.js'
import { ContactsModule } from './master/contact/index.js'
import { HomeModule } from './home/home.module.js'
import { MasterDataModule } from './foundation/master-data/index.js'
import { OrdersModule } from './master/order/index.js'
import { ProductsModule } from './master/product/index.js'
import { SiteModule } from './site/index.js'
import { CompanySettingsModule } from './settings/company-settings/index.js'
import { DocumentSettingsModule } from './settings/document-settings/index.js'
import { GstComplianceModule } from './gst/gst-compliance/index.js'
import { MediaModule } from './media/index.js'
import { MailModule } from './mail/index.js'
import { TaskManagerModule } from './task-manager/index.js'
import { CrmModule } from './crm/index.js'
import { TallyModule } from './tally/index.js'
import { FrappeModule } from './frappe/index.js'
import { TConnectModule } from './tconnect/index.js'
import { TirupurConnectModule } from './tirupur-connect/index.js'
import { EcommerceModule } from './ecommerce/index.js'
import { AgentOsModule } from './agent-os/index.js'
import { SubscriptionModule } from './subscription/index.js'
import { AuditorClientModule } from './auditor/client/index.js'
import { AuditorContactCredentialModule } from './auditor/contact-credential/index.js'
import { AuditorGstFilingModule } from './auditor/gst-filing/index.js'
import { BlogModule } from './blog/index.js'
<<<<<<< Updated upstream
import { CxSyncModule } from './cxsync/index.js'
=======
import { SystemUpdateModule } from '../core/system/system-update/system-update.module.js'
>>>>>>> Stashed changes
import { QueueManagerModule } from '../core/system/queue-manager/queue-manager.module.js'
import { DatabaseManagerModule } from '../core/system/database-manager/database-manager.module.js'
import { AppRuntimeModule } from '../core/system/app-runtime/app-runtime.module.js'
import { ProjectDocsModule } from '../core/system/project-docs/project-docs.module.js'
import { AppSetupModule } from '../framework/setup/app-setup/index.js'
import { HealthModule } from '../core/health/health.module.js'
import { IndustryModule } from '../core/industry/industry.module.js'
import { TenantDomainModule } from '../core/tenant-domain/tenant-domain.module.js'
import { TenantModule } from '../core/tenant/tenant.module.js'
import { Module } from '../core/decorators/module.js'
import { AuthAnyGuard } from '../core/guards/auth-any.guard.js'
import { AuthGuard } from '../core/guards/auth.guard.js'

@Module({
  imports: [
    AuthModule,
    HomeModule,
    HealthModule,
    SiteModule,
    QueueManagerModule,
    DatabaseManagerModule,
    AppRuntimeModule,
    ProjectDocsModule,
    TenantModule,
    TenantDomainModule,
    AppSetupModule,
    IndustryModule,
    ...commonModuleClasses,
    MasterDataModule,
    ContactsModule,
    ProductsModule,
    OrdersModule,
    CompanySettingsModule,
    DocumentSettingsModule,
    GstComplianceModule,
    MediaModule,
    MailModule,
    TaskManagerModule,
    CrmModule,
    TallyModule,
    FrappeModule,
    TConnectModule,
    TirupurConnectModule,
    EcommerceModule,
    AgentOsModule,
    SubscriptionModule,
    AuditorClientModule,
    AuditorContactCredentialModule,
    AuditorGstFilingModule,
    BlogModule,
    CompanyModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class AppModule {}
