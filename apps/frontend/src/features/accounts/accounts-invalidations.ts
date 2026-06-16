import type { QueryClient } from "@tanstack/react-query"
import type { AuthSession } from "src/features/auth/auth-client"
import { accountQueryKeys } from "./accounts-queries"

export const accountInvalidations = {
  afterReportRecalculate,
  invalidateReportDependents,
}

async function afterReportRecalculate(queryClient: QueryClient, session: AuthSession) {
  await invalidateReportDependents(queryClient, session)
}

async function invalidateReportDependents(queryClient: QueryClient, session: AuthSession) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.trialBalance(session) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.profitLoss(session) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.balanceSheet(session) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.dayBook(session) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.vouchers(session) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.postingBook(session) }),
  ])
}
