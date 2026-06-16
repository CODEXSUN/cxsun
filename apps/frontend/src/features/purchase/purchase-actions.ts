import type { AuthSession } from "src/features/auth/auth-client"
import {
  addPurchaseComment,
  createPurchaseCorrection,
  createPurchaseReversal,
  destroyPurchaseEntry,
  downloadPurchasePdf,
  restorePurchaseEntry,
  runPurchaseTool,
  upsertPurchaseEntry,
  type PurchaseEntry,
  type PurchaseEntryInput,
} from "./purchase-client"

export const purchaseActions = {
  addComment: (session: AuthSession, entry: PurchaseEntry, body: string) => addPurchaseComment(session, entry, body),
  createCorrection: (session: AuthSession, entry: PurchaseEntry) => createPurchaseCorrection(session, entry),
  createReversal: (session: AuthSession, entry: PurchaseEntry) => createPurchaseReversal(session, entry),
  downloadPdf: (session: AuthSession, entry: PurchaseEntry, printHtml: string) => downloadPurchasePdf(session, entry, printHtml),
  restore: (session: AuthSession, entry: PurchaseEntry) => restorePurchaseEntry(session, entry),
  runTool: (session: AuthSession, entry: PurchaseEntry, tool: string, printHtml?: string) => runPurchaseTool(session, entry, tool, printHtml),
  saveDraft: (session: AuthSession, input: PurchaseEntryInput) => upsertPurchaseEntry(session, input),
  saveAndPost: (session: AuthSession, input: PurchaseEntryInput) => upsertPurchaseEntry(session, { ...input, status: "posted" }),
  suspend: (session: AuthSession, entry: PurchaseEntry) => destroyPurchaseEntry(session, entry),
}
