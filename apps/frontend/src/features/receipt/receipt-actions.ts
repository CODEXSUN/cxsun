import type { AuthSession } from "src/features/auth/auth-client"
import {
  addReceiptComment,
  createReceiptCorrection,
  createReceiptReversal,
  destroyReceiptEntry,
  downloadReceiptPdf,
  restoreReceiptEntry,
  runReceiptTool,
  upsertReceiptEntry,
  type ReceiptEntry,
  type ReceiptEntryInput,
} from "./receipt-client"

export const receiptActions = {
  addComment: (session: AuthSession, entry: ReceiptEntry, body: string) => addReceiptComment(session, entry, body),
  createCorrection: (session: AuthSession, entry: ReceiptEntry) => createReceiptCorrection(session, entry),
  createReversal: (session: AuthSession, entry: ReceiptEntry) => createReceiptReversal(session, entry),
  downloadPdf: (session: AuthSession, entry: ReceiptEntry, printHtml: string) => downloadReceiptPdf(session, entry, printHtml),
  restore: (session: AuthSession, entry: ReceiptEntry) => restoreReceiptEntry(session, entry),
  runTool: (session: AuthSession, entry: ReceiptEntry, tool: string, printHtml?: string) => runReceiptTool(session, entry, tool, printHtml),
  saveDraft: (session: AuthSession, input: ReceiptEntryInput) => upsertReceiptEntry(session, input),
  saveAndPost: (session: AuthSession, input: ReceiptEntryInput) => upsertReceiptEntry(session, { ...input, status: "posted" }),
  suspend: (session: AuthSession, entry: ReceiptEntry) => destroyReceiptEntry(session, entry),
}
