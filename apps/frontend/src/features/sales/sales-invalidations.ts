import type { QueryClient } from "@tanstack/react-query"
import type { AuthSession } from "src/features/auth/auth-client"
import { accountInvalidations } from "src/features/accounts/accounts-invalidations"
import { salesQueryKeys } from "./sales-queries"

export const salesInvalidations = {
  afterComplianceAction: async (queryClient: QueryClient, session: AuthSession) => {
    await Promise.all([
      invalidateEntries(queryClient, session),
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.gstCompliance() }),
    ])
  },
  afterSave: async (queryClient: QueryClient, session: AuthSession) => {
    clearNextInvoicePreview(queryClient, session)
    await Promise.all([
      invalidateEntries(queryClient, session),
      invalidateEntryDependents(queryClient, session),
      invalidateNextInvoicePreview(queryClient, session),
      invalidatePostingDependents(queryClient, session),
    ])
  },
  afterToolAction: async (queryClient: QueryClient, session: AuthSession) => {
    await invalidateEntries(queryClient, session)
  },
  clearNextInvoicePreview,
  invalidateEntries,
  invalidatePostingDependents,
}

function clearNextInvoicePreview(queryClient: QueryClient, session: AuthSession) {
  queryClient.removeQueries({ queryKey: salesQueryKeys.nextInvoice(session) })
}

async function invalidateEntries(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: salesQueryKeys.entries(session) })
}

async function invalidateEntryDependents(queryClient: QueryClient, session: AuthSession) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sales-entry-detail", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.monthly(session) }),
    queryClient.invalidateQueries({ queryKey: salesQueryKeys.openInvoices(session) }),
  ])
}

async function invalidateNextInvoicePreview(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: salesQueryKeys.nextInvoiceTenant(session) })
}

async function invalidatePostingDependents(queryClient: QueryClient, session: AuthSession) {
  const tenantSlug = session.selectedTenant.slug

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["billing-overview-sales", tenantSlug] }),
    accountInvalidations.invalidateReportDependents(queryClient, session),
  ])
}
