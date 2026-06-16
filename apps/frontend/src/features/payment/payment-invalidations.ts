import type { QueryClient } from "@tanstack/react-query"
import type { AuthSession } from "src/features/auth/auth-client"
import { accountInvalidations } from "src/features/accounts/accounts-invalidations"
import { paymentQueryKeys } from "./payment-queries"

export const paymentInvalidations = {
  afterSave: async (queryClient: QueryClient, session: AuthSession) => {
    clearNextPaymentPreview(queryClient, session)
    await Promise.all([
      invalidateEntries(queryClient, session),
      invalidateNextPaymentPreview(queryClient, session),
      invalidateAllocationDependents(queryClient, session),
      invalidatePostingDependents(queryClient, session),
    ])
  },
  afterToolAction: async (queryClient: QueryClient, session: AuthSession) => {
    await invalidateEntries(queryClient, session)
  },
  clearNextPaymentPreview,
  invalidateEntries,
  invalidatePostingDependents,
}

function clearNextPaymentPreview(queryClient: QueryClient, session: AuthSession) {
  queryClient.removeQueries({ queryKey: paymentQueryKeys.nextPayment(session) })
}

async function invalidateEntries(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: paymentQueryKeys.entries(session) })
}

async function invalidateNextPaymentPreview(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: paymentQueryKeys.nextPaymentTenant(session) })
}

async function invalidateAllocationDependents(queryClient: QueryClient, session: AuthSession) {
  await queryClient.invalidateQueries({ queryKey: paymentQueryKeys.openPurchases(session) })
}

async function invalidatePostingDependents(queryClient: QueryClient, session: AuthSession) {
  const tenantSlug = session.selectedTenant.slug

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["billing-overview-payment", tenantSlug] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-entries", tenantSlug] }),
    accountInvalidations.invalidateReportDependents(queryClient, session),
  ])
}
