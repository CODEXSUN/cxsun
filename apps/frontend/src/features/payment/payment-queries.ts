import { listAllAccountLedgers } from "src/features/accounts/accounts-client"
import { listCompanies } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { listPurchaseEntries } from "src/features/purchase/purchase-client"
import type { AuthSession } from "src/features/auth/auth-client"
import { listPaymentContactLookups, listPaymentEntries } from "./payment-client"

export const paymentQueryKeys = {
  contactTypes: (session: AuthSession) => ["payment-contact-types", session.selectedTenant.slug] as const,
  contactTypesDialog: (session: AuthSession) => ["Payment-contact-types", session.selectedTenant.slug] as const,
  contacts: (session: AuthSession) => ["payment-contact-lookups", session.selectedTenant.slug] as const,
  entries: (session: AuthSession) => ["payment-entries", session.selectedTenant.slug] as const,
  ledgers: (session: AuthSession) => ["payment-money-ledgers", session.selectedTenant.slug] as const,
  nextPayment: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug, "payment"] as const,
  nextPaymentTenant: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug] as const,
  openPurchases: (session: AuthSession) => ["payment-open-purchases", session.selectedTenant.slug] as const,
  printCompany: (session: AuthSession) => ["payment-print-company", session.selectedTenant.slug] as const,
}

export const paymentQueries = {
  contactTypes: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.contactTypes(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  contactTypesDialog: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.contactTypesDialog(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  contacts: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.contacts(session),
    queryFn: () => listPaymentContactLookups(session),
  }),
  entries: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.entries(session),
    queryFn: () => listPaymentEntries(session),
  }),
  ledgers: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.ledgers(session),
    queryFn: () => listAllAccountLedgers(session),
  }),
  nextPayment: (session: AuthSession, enabled: boolean) => ({
    enabled,
    queryKey: paymentQueryKeys.nextPayment(session),
    queryFn: () => nextDocumentNumberSetting(session, "payment"),
    refetchOnMount: "always" as const,
  }),
  openPurchases: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.openPurchases(session),
    queryFn: () => listPurchaseEntries(session),
  }),
  printCompany: (session: AuthSession) => ({
    queryKey: paymentQueryKeys.printCompany(session),
    queryFn: () => listCompanies(session),
  }),
}
