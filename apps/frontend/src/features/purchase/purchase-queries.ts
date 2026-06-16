import { listCompanies } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import type { AuthSession } from "src/features/auth/auth-client"
import { listPurchaseCommonLookups, listPurchaseContactLookups, listPurchaseEntries, type PurchaseCommonLookupKey } from "./purchase-client"

export const purchaseQueryKeys = {
  addressLabels: (session: AuthSession, moduleKey: string) => ["Purchase-address-labels", session.selectedTenant.slug, moduleKey] as const,
  contactTypes: (session: AuthSession) => ["Purchase-lookups", session.selectedTenant.slug, "contactTypes"] as const,
  entries: (session: AuthSession) => ["purchase-entries", session.selectedTenant.slug] as const,
  lookup: (session: AuthSession, key: PurchaseCommonLookupKey | "contacts" | "transports") => ["Purchase-lookups", session.selectedTenant.slug, key] as const,
  nextEntry: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug, "purchase"] as const,
  nextEntryTenant: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug] as const,
  printCompany: (session: AuthSession) => ["Purchase-print-company", session.selectedTenant.slug] as const,
  printContacts: (session: AuthSession) => ["Purchase-print-contacts", session.selectedTenant.slug] as const,
}

export const purchaseQueries = {
  addressLabels: (session: AuthSession, moduleKey: string) => ({
    queryKey: purchaseQueryKeys.addressLabels(session, moduleKey),
    queryFn: () => listMasterDataRecords(session, moduleKey),
  }),
  contactTypes: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.contactTypes(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  entries: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.entries(session),
    queryFn: () => listPurchaseEntries(session),
  }),
  contacts: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.lookup(session, "contacts"),
    queryFn: () => listPurchaseContactLookups(session),
  }),
  hsnCodes: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.lookup(session, "hsnCodes"),
    queryFn: () => listPurchaseCommonLookups(session, "hsnCodes"),
  }),
  nextEntry: (session: AuthSession, enabled: boolean) => ({
    enabled,
    queryKey: purchaseQueryKeys.nextEntry(session),
    queryFn: () => nextDocumentNumberSetting(session, "purchase"),
    refetchOnMount: "always" as const,
  }),
  printCompany: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.printCompany(session),
    queryFn: () => listCompanies(session),
  }),
  printContacts: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.printContacts(session),
    queryFn: () => listPurchaseContactLookups(session),
  }),
  taxes: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.lookup(session, "taxes"),
    queryFn: () => listPurchaseCommonLookups(session, "taxes"),
  }),
  transports: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.lookup(session, "transports"),
    queryFn: () => listMasterDataRecords(session, "transports"),
  }),
  units: (session: AuthSession) => ({
    queryKey: purchaseQueryKeys.lookup(session, "units"),
    queryFn: () => listPurchaseCommonLookups(session, "units"),
  }),
}
