import { Module } from '@cxsun/platform/core/decorators/module.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '@cxsun/platform/modules/auth/infrastructure/auth.repository.js'
import { TenantRepository } from '@cxsun/platform/core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '@cxsun/platform/core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DocumentNumberRepository } from '@cxsun/platform/modules/settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '@cxsun/platform/modules/mail/mail.repository.js'
import { AccountsEngineRepository } from '../../accounts/accounts-engine.repository.js'
import { AccountsEntryPostingService } from '../../accounts/accounts-entry-posting.service.js'
import { EntryDocumentMailService } from '@cxsun/platform/modules/entries/shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '@cxsun/platform/modules/entries/shared/entry-document-pdf-download.service.js'
import { PrintHtmlPdfService } from '@cxsun/platform/modules/entries/shared/print-html-pdf.service.js'
import { EntryPostingControlService } from '@cxsun/platform/modules/entries/shared/entry-posting-control.service.js'
import { PaymentEntryController } from './payment-entry.controller.js'
import { PaymentEntryRepository } from './payment-entry.repository.js'
import { PaymentEntryService } from './payment-entry.service.js'

@Module({
  controllers: [PaymentEntryController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    EntryDocumentPdfDownloadService,
    PrintHtmlPdfService,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    EntryPostingControlService,
    PaymentEntryRepository,
    PaymentEntryService,
  ],
})
export class PaymentEntryModule {}
