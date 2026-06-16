import type { QueryClient } from "@tanstack/react-query"
import type { AuthSession } from "src/features/auth/auth-client"
import { accountInvalidations } from "src/features/accounts/accounts-invalidations"
import { purchaseQueryKeys } from "./purchase-queries"

export const purchaseInvalidations = {
  afterSave: async (queryClient: QueryClient, session: AuthSession) => {
    clearNextEntryPreview(queryClient, session)
    await Promise.all([
      invalidateEntries(queryClient, session),
      invalidateNextEntryPreview(queryClient, session),
      invalidatePostingDependents(queryClient, session),
    ])
  },
  afterToolAction: async (queryClient: QueryClient, session: AuthSession) => {
    await invalidateEntries(queryClient, session)
  },
  clearNextEntryPreview,
  invalidateEntries,
  invalidatePostingDependents,
}

function clearNextEntryPreview(queryClient: QueryClient, session: AuthSession) {
  queryClient.removeQueries({ queryKey: purchaseQueryKeys.nextEntry(session) })
}

async function invalidateEntries(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: purchaseQueryKeys.entries(session) })
}

async function invalidateNextEntryPreview(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: purchaseQueryKeys.nextEntryTenant(session) })
}

async function invalidatePostingDependents(queryClient: QueryClient, session: AuthSession) {
  const tenantSlug = session.selectedTenant.slug

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["billing-overview-purchase", tenantSlug] }),
    accountInvalidations.invalidateReportDependents(queryClient, session),
  ])
}
