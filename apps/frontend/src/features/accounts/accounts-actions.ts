import type { AuthSession } from "src/features/auth/auth-client"
import {
  cancelAccountVoucher,
  postAccountVoucher,
  recalculateAccountReports,
  upsertAccountVoucher,
  type AccountVoucher,
  type AccountVoucherInput,
} from "./accounts-client"

export const accountActions = {
  cancelVoucher: (session: AuthSession, voucher: AccountVoucher) => cancelAccountVoucher(session, voucher),
  postVoucher: (session: AuthSession, voucher: AccountVoucher) => postAccountVoucher(session, voucher),
  recalculateReportTables: (session: AuthSession) => recalculateAccountReports(session),
  saveVoucher: (session: AuthSession, input: AccountVoucherInput) => upsertAccountVoucher(session, input),
}
