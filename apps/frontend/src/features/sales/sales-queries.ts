import { listCompanies } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import type { AuthSession } from "src/features/auth/auth-client"
import { listSalesCommonLookups, listSalesContactLookups, listSalesEntries, type SalesCommonLookupKey } from "./sales-client"

export const salesQueryKeys = {
  addressLabels: (session: AuthSession, moduleKey: string) => ["sales-address-labels", session.selectedTenant.slug, moduleKey] as const,
  contactTypes: (session: AuthSession) => ["sales-lookups", session.selectedTenant.slug, "contactTypes"] as const,
  entries: (session: AuthSession) => ["sales-entries", session.selectedTenant.slug] as const,
  gstCompliance: () => ["gst-compliance"] as const,
  lookup: (session: AuthSession, key: SalesCommonLookupKey | "contacts" | "salesAccountTypes" | "transports") => ["sales-lookups", session.selectedTenant.slug, key] as const,
  nextInvoice: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug, "sales"] as const,
  nextInvoiceTenant: (session: AuthSession) => ["document-number-next-preview", session.selectedTenant.slug] as const,
  printCompany: (session: AuthSession) => ["sales-print-company", session.selectedTenant.slug] as const,
  printContacts: (session: AuthSession) => ["sales-print-contacts", session.selectedTenant.slug] as const,
}

export const salesQueries = {
  addressLabels: (session: AuthSession, moduleKey: string) => ({
    queryKey: salesQueryKeys.addressLabels(session, moduleKey),
    queryFn: () => listMasterDataRecords(session, moduleKey),
  }),
  contactTypes: (session: AuthSession) => ({
    queryKey: salesQueryKeys.contactTypes(session),
    queryFn: () => listMasterDataRecords(session, "contactTypes"),
  }),
  entries: (session: AuthSession) => ({
    queryKey: salesQueryKeys.entries(session),
    queryFn: () => listSalesEntries(session),
  }),
  hsnCodes: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "hsnCodes"),
    queryFn: () => listSalesCommonLookups(session, "hsnCodes"),
  }),
  contacts: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "contacts"),
    queryFn: () => listSalesContactLookups(session),
  }),
  nextInvoice: (session: AuthSession, enabled: boolean) => ({
    enabled,
    queryKey: salesQueryKeys.nextInvoice(session),
    queryFn: () => nextDocumentNumberSetting(session, "sales"),
    refetchOnMount: "always" as const,
  }),
  printCompany: (session: AuthSession) => ({
    queryKey: salesQueryKeys.printCompany(session),
    queryFn: () => listCompanies(session),
  }),
  printContacts: (session: AuthSession) => ({
    queryKey: salesQueryKeys.printContacts(session),
    queryFn: () => listSalesContactLookups(session),
  }),
  salesAccountTypes: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "salesAccountTypes"),
    queryFn: () => listMasterDataRecords(session, "salesAccountTypes"),
  }),
  taxes: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "taxes"),
    queryFn: () => listSalesCommonLookups(session, "taxes"),
  }),
  transports: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "transports"),
    queryFn: () => listMasterDataRecords(session, "transports"),
  }),
  units: (session: AuthSession) => ({
    queryKey: salesQueryKeys.lookup(session, "units"),
    queryFn: () => listSalesCommonLookups(session, "units"),
  }),
}
