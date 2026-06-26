import 'reflect-metadata'
import { Module } from '@cxsun/platform/core/decorators/module.js'
import { AuthAnyGuard } from '@cxsun/platform/core/guards/auth-any.guard.js'
import { AuthGuard } from '@cxsun/platform/core/guards/auth.guard.js'
import { HealthModule } from '@cxsun/platform/core/health/health.module.js'
import { TenantModule } from '@cxsun/platform/core/tenant/tenant.module.js'
import { TenantDomainModule } from '@cxsun/platform/core/tenant-domain/tenant-domain.module.js'
import { AuthModule } from '@cxsun/platform/modules/auth/auth.module.js'
import { commonModuleClasses } from '@cxsun/platform/modules/common/index.js'
import { MasterDataModule } from '@cxsun/platform/modules/foundation/master-data/index.js'
import { GstComplianceModule } from '@cxsun/platform/modules/gst/gst-compliance/index.js'
import { ContactsModule } from '@cxsun/platform/modules/master/contact/index.js'
import { ProductsModule } from '@cxsun/platform/modules/master/product/index.js'
import { OrdersModule } from '@cxsun/platform/modules/master/order/index.js'
import { CompanyModule } from '@cxsun/platform/modules/master/company/company.module.js'
import { SalesEntryModule } from './modules/entries/sales/index.js'
import { QuotationEntryModule } from './modules/entries/quotation/index.js'
import { ExportSalesEntryModule } from './modules/entries/export-sales/index.js'
import { PurchaseEntryModule } from './modules/entries/purchase/index.js'
import { ReceiptEntryModule } from './modules/entries/receipt/index.js'
import { PaymentEntryModule } from './modules/entries/payment/index.js'
import { AccountsModule } from './modules/accounts/index.js'
import { PurchaseReceiptModule } from './modules/stock/inward/purchase-receipt/index.js'
import { DeliveryNoteModule } from './modules/stock/outward/delivery-note/index.js'
import { StockLedgerModule } from './modules/stock/ledger/index.js'
import { CompanySettingsModule } from '@cxsun/platform/modules/settings/company-settings/index.js'
import { DocumentSettingsModule } from '@cxsun/platform/modules/settings/document-settings/index.js'
import { MailModule } from '@cxsun/platform/modules/mail/index.js'
import { MediaModule } from '@cxsun/platform/modules/media/index.js'

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    CompanyModule,
    ...commonModuleClasses,
    MasterDataModule,
    ContactsModule,
    ProductsModule,
    OrdersModule,
    GstComplianceModule,
    CompanySettingsModule,
    DocumentSettingsModule,
    MailModule,
    MediaModule,
    SalesEntryModule,
    QuotationEntryModule,
    ExportSalesEntryModule,
    PurchaseEntryModule,
    ReceiptEntryModule,
    PaymentEntryModule,
    AccountsModule,
    PurchaseReceiptModule,
    DeliveryNoteModule,
    StockLedgerModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class BillingApiModule {}
