import { listAllAccountLedgers } from "src/features/accounts/accounts-client"
import { listCompanies } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { listSalesEntries } from "src/features/sales/sales-client"
import type { AuthSession } from "src/features/auth/auth-client"
import { listReceiptContactLookups, listReceiptEntries } from "./receipt-client"

export const receiptQueryKeys = {
  contactTypes: (session: AuthSession) => ["receipt-contact-types", session.selectedTenant.slug] as const,
  contactTypesDialog: (session: AuthSession) => ["Receipt-contact-types", session.selectedTenant.slug] as const,
  contacts: (session: AuthSession) => ["receipt-contact-lookups", session.selectedTenant.slug] as const,
  entries: (session: AuthSession) => ["receipt-entries", session.selectedTenant.slug] as const,
  ledgers: (session: AuthSession) => ["receipt-money-ledgers", session.selectedTenant.slug] as const,
  nextReceipt: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug, "receipt"] as const,
  nextReceiptTenant: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug] as const,
  openSales: (session: AuthSession) => ["receipt-open-sales", session.selectedTenant.slug] as const,
  printCompany: (session: AuthSession) => ["receipt-print-company", session.selectedTenant.slug] as const,
}

export const receiptQueries = {
  contactTypes: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.contactTypes(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  contactTypesDialog: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.contactTypesDialog(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  contacts: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.contacts(session),
    queryFn: () => listReceiptContactLookups(session),
  }),
  entries: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.entries(session),
    queryFn: () => listReceiptEntries(session),
  }),
  ledgers: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.ledgers(session),
    queryFn: () => listAllAccountLedgers(session),
  }),
  nextReceipt: (session: AuthSession, enabled: boolean) => ({
    enabled,
    queryKey: receiptQueryKeys.nextReceipt(session),
    queryFn: () => nextDocumentNumberSetting(session, "receipt"),
    refetchOnMount: "always" as const,
  }),
  openSales: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.openSales(session),
    queryFn: () => listSalesEntries(session),
  }),
  printCompany: (session: AuthSession) => ({
    queryKey: receiptQueryKeys.printCompany(session),
    queryFn: () => listCompanies(session),
  }),
}
