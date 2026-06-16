import { upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import type { AuthSession } from "src/features/auth/auth-client"
import {
  addSalesComment,
  createSalesCorrection,
  createSalesReversal,
  destroySalesEntry,
  downloadSalesPdf,
  restoreSalesEntry,
  runSalesTool,
  upsertSalesEntry,
  type SalesEntry,
  type SalesEntryInput,
} from "./sales-client"

export const salesActions = {
  addComment: (session: AuthSession, entry: SalesEntry, body: string) => addSalesComment(session, entry, body),
  createCorrection: (session: AuthSession, entry: SalesEntry) => createSalesCorrection(session, entry),
  createReversal: (session: AuthSession, entry: SalesEntry) => createSalesReversal(session, entry),
  createSalesAccountType: (session: AuthSession, name: string) => upsertMasterDataRecord(session, "salesAccountTypes", { name, description: "", is_active: true }),
  downloadPdf: (session: AuthSession, entry: SalesEntry, printHtml: string) => downloadSalesPdf(session, entry, printHtml),
  restore: (session: AuthSession, entry: SalesEntry) => restoreSalesEntry(session, entry),
  runTool: (session: AuthSession, entry: SalesEntry, tool: string, printHtml?: string) => runSalesTool(session, entry, tool, printHtml),
  saveDraft: (session: AuthSession, input: SalesEntryInput) => upsertSalesEntry(session, input),
  saveAndPost: (session: AuthSession, input: SalesEntryInput) => upsertSalesEntry(session, { ...input, status: "posted" }),
  suspend: (session: AuthSession, entry: SalesEntry) => destroySalesEntry(session, entry),
}
