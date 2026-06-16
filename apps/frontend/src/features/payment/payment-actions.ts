import type { AuthSession } from "src/features/auth/auth-client"
import {
  addPaymentComment,
  createPaymentCorrection,
  createPaymentReversal,
  destroyPaymentEntry,
  downloadPaymentPdf,
  restorePaymentEntry,
  runPaymentTool,
  upsertPaymentEntry,
  type PaymentEntry,
  type PaymentEntryInput,
} from "./payment-client"

export const paymentActions = {
  addComment: (session: AuthSession, entry: PaymentEntry, body: string) => addPaymentComment(session, entry, body),
  createCorrection: (session: AuthSession, entry: PaymentEntry) => createPaymentCorrection(session, entry),
  createReversal: (session: AuthSession, entry: PaymentEntry) => createPaymentReversal(session, entry),
  downloadPdf: (session: AuthSession, entry: PaymentEntry, printHtml: string) => downloadPaymentPdf(session, entry, printHtml),
  restore: (session: AuthSession, entry: PaymentEntry) => restorePaymentEntry(session, entry),
  runTool: (session: AuthSession, entry: PaymentEntry, tool: string, printHtml?: string) => runPaymentTool(session, entry, tool, printHtml),
  saveDraft: (session: AuthSession, input: PaymentEntryInput) => upsertPaymentEntry(session, input),
  saveAndPost: (session: AuthSession, input: PaymentEntryInput) => upsertPaymentEntry(session, { ...input, status: "posted" }),
  suspend: (session: AuthSession, entry: PaymentEntry) => destroyPaymentEntry(session, entry),
}
