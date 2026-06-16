import type { AuthSession } from "src/features/auth/auth-client"
import {
  listAccountBalanceSheet,
  listAccountDayBook,
  listAccountPostingBook,
  listAccountProfitLoss,
  listAccountTrialBalance,
  listAccountVouchers,
  type AccountBookType,
} from "./accounts-client"

export const accountQueryKeys = {
  balanceSheet: (session: AuthSession, accountingYearId?: number | null) => compactKey("account-balance-sheet", session.selectedTenant.slug, accountingYearId),
  dayBook: (session: AuthSession, accountingYearId?: number | null) => compactKey("account-day-book", session.selectedTenant.slug, accountingYearId),
  postingBook: (session: AuthSession, bookType?: AccountBookType, accountingYearId?: number | null) => compactKey("account-posting-book", session.selectedTenant.slug, bookType, accountingYearId),
  profitLoss: (session: AuthSession, accountingYearId?: number | null) => compactKey("account-profit-loss", session.selectedTenant.slug, accountingYearId),
  trialBalance: (session: AuthSession, accountingYearId?: number | null) => compactKey("account-trial-balance", session.selectedTenant.slug, accountingYearId),
  vouchers: (session: AuthSession) => ["account-vouchers", session.selectedTenant.slug] as const,
}

export const accountQueries = {
  balanceSheet: (session: AuthSession, accountingYearId?: number | null) => ({
    queryKey: accountQueryKeys.balanceSheet(session, accountingYearId),
    queryFn: () => listAccountBalanceSheet(session, accountingYearId),
  }),
  dayBook: (session: AuthSession, accountingYearId?: number | null) => ({
    queryKey: accountQueryKeys.dayBook(session, accountingYearId),
    queryFn: () => listAccountDayBook(session, accountingYearId),
  }),
  postingBook: (session: AuthSession, bookType: AccountBookType, accountingYearId?: number | null) => ({
    queryKey: accountQueryKeys.postingBook(session, bookType, accountingYearId),
    queryFn: () => listAccountPostingBook(session, bookType, accountingYearId),
  }),
  profitLoss: (session: AuthSession, accountingYearId?: number | null) => ({
    queryKey: accountQueryKeys.profitLoss(session, accountingYearId),
    queryFn: () => listAccountProfitLoss(session, accountingYearId),
  }),
  trialBalance: (session: AuthSession, accountingYearId?: number | null) => ({
    queryKey: accountQueryKeys.trialBalance(session, accountingYearId),
    queryFn: () => listAccountTrialBalance(session, accountingYearId),
  }),
  vouchers: (session: AuthSession) => ({
    queryKey: accountQueryKeys.vouchers(session),
    queryFn: () => listAccountVouchers(session),
  }),
}

function compactKey(...parts: Array<number | string | null | undefined>) {
  return parts.filter((part): part is number | string => part !== null && part !== undefined) as readonly (number | string)[]
}
