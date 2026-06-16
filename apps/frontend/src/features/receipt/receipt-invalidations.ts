import type { QueryClient } from "@tanstack/react-query"
import type { AuthSession } from "src/features/auth/auth-client"
import { accountInvalidations } from "src/features/accounts/accounts-invalidations"
import { receiptQueryKeys } from "./receipt-queries"

export const receiptInvalidations = {
  afterSave: async (queryClient: QueryClient, session: AuthSession) => {
    clearNextReceiptPreview(queryClient, session)
    await Promise.all([
      invalidateEntries(queryClient, session),
      invalidateNextReceiptPreview(queryClient, session),
      invalidateAllocationDependents(queryClient, session),
      invalidatePostingDependents(queryClient, session),
    ])
  },
  afterToolAction: async (queryClient: QueryClient, session: AuthSession) => {
    await invalidateEntries(queryClient, session)
  },
  clearNextReceiptPreview,
  invalidateEntries,
  invalidatePostingDependents,
}

function clearNextReceiptPreview(queryClient: QueryClient, session: AuthSession) {
  queryClient.removeQueries({ queryKey: receiptQueryKeys.nextReceipt(session) })
}

async function invalidateEntries(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: receiptQueryKeys.entries(session) })
}

async function invalidateNextReceiptPreview(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: receiptQueryKeys.nextReceiptTenant(session) })
}

async function invalidateAllocationDependents(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: receiptQueryKeys.openSales(session) })
}

async function invalidatePostingDependents(queryClient: QueryClient, session: AuthSession) {
  const tenantSlug = session.selectedTenant.slug

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["billing-overview-receipt", tenantSlug] }),
    queryClient.invalidateQueries({ queryKey: ["sales-entries", tenantSlug] }),
    accountInvalidations.invalidateReportDependents(queryClient, session),
  ])
}
