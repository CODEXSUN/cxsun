import { Module } from '@cxsun/platform/core/decorators/module.js'
import { MasterQueueService } from '@cxsun/platform/infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '@cxsun/platform/modules/auth/infrastructure/auth.repository.js'
import { TenantRepository } from '@cxsun/platform/core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '@cxsun/platform/core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { QuotationEntryEventBus } from './application/quotation-entry-event-bus.js'
import { QuotationEntryService } from './application/quotation-entry.service.js'
import { QuotationEntryRepository } from './infrastructure/persistence/quotation-entry.repository.js'
import { QuotationEntryV1Controller } from './interface/http/quotation-entry-v1.controller.js'
import { DocumentNumberRepository } from '@cxsun/platform/modules/settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '@cxsun/platform/modules/mail/mail.repository.js'
import { EntryDocumentMailService } from '@cxsun/platform/modules/entries/shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '@cxsun/platform/modules/entries/shared/entry-document-pdf-download.service.js'
import { PrintHtmlPdfService } from '@cxsun/platform/modules/entries/shared/print-html-pdf.service.js'
import { SalesEntryRepository } from '../sales/infrastructure/persistence/sales-entry.repository.js'

@Module({
  controllers: [QuotationEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    EntryDocumentPdfDownloadService,
    PrintHtmlPdfService,
    QuotationEntryEventBus,
    DocumentNumberRepository,
    SalesEntryRepository,
    QuotationEntryRepository,
    QuotationEntryService,
  ],
})
export class QuotationEntryModule {}

