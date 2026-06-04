import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type AccountBookType = "cash" | "bank"
export type AccountEntryDirection = "in" | "out"

export interface AccountLedger {
  id: number
  uuid: string
  path: string
  account_type: "cash" | "bank" | "fixed_asset"
  code: string
  name: string
  opening_balance: number
  current_balance: number
  status: string
  is_active: boolean | number
}

export interface AccountLedgerInput {
  id?: number
  uuid?: string
  account_type?: "cash" | "bank" | "fixed_asset"
  code?: string | null
  name?: string | null
  opening_balance?: number | string | null
  status?: string | null
  is_active?: boolean | number
}

export interface AccountBookEntry {
  id: number
  uuid: string
  company_id: number
  accounting_year_id: number
  ledger_id: number
  book_type: AccountBookType
  voucher_no: string
  voucher_date: string
  direction: AccountEntryDirection
  party_id: string | null
  party_name: string | null
  particulars: string | null
  narration: string | null
  reference_no: string | null
  amount: number
  balance_after: number
  status: string
  notes: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  comments: AccountBookComment[]
  activities: AccountBookActivity[]
}

export interface AccountBookComment {
  id: number
  uuid: string
  entry_id: number
  author_email: string
  body: string
  created_at: string
}

export interface AccountBookActivity {
  id: number
  uuid: string
  entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string | null
  created_at: string
}

export interface AccountBookEntryInput {
  id?: number
  uuid?: string
  ledger_id?: number
  voucher_no?: string
  voucher_date?: string
  direction?: AccountEntryDirection
  party_id?: string | null
  party_name?: string | null
  particulars?: string | null
  narration?: string | null
  reference_no?: string | null
  amount?: number
  status?: string
  notes?: string | null
  is_active?: boolean | number
}

export function emptyAccountBookEntry(): AccountBookEntryInput {
  return {
    voucher_date: new Date().toISOString().slice(0, 10),
    direction: "in",
    party_id: null,
    party_name: "",
    particulars: "",
    narration: "",
    reference_no: "",
    amount: 0,
    status: "draft",
    notes: "",
    is_active: true,
  }
}

export async function listAccountLedgers(session: AuthSession, type: AccountBookType) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/ledgers/${type}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account ledger list failed with status ${response.status}.`)
  return (await response.json()) as AccountLedger[]
}

export async function upsertAccountLedger(session: AuthSession, type: AccountBookType, input: AccountLedgerInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/ledgers/${type}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account ledger save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; ledger?: AccountLedger; error?: string }
  if (!result.ok || !result.ledger) throw new Error(result.error ?? "Account ledger save failed.")
  return result.ledger
}

export async function listAccountBookEntries(session: AuthSession, bookType: AccountBookType) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account book list failed with status ${response.status}.`)
  return (await response.json()) as AccountBookEntry[]
}

export async function upsertAccountBookEntry(session: AuthSession, bookType: AccountBookType, input: AccountBookEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: AccountBookEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Account book save failed.")
  return result.entry
}

export async function destroyAccountBookEntry(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/destroy`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book delete failed with status ${response.status}.`)
}

export async function restoreAccountBookEntry(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/restore`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book restore failed with status ${response.status}.`)
}

export async function addAccountBookComment(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, body: string) {
  return accountBookAction(session, bookType, entry, "comment", { body })
}

export async function runAccountBookTool(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, tool: string) {
  return accountBookAction(session, bookType, entry, "tool", { tool })
}

async function accountBookAction(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, action: "comment" | "tool", body: Record<string, unknown>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/${action}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: AccountBookEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? `Account book ${action} failed.`)
  return result.entry
}

function bookPath(bookType: AccountBookType) {
  return bookType === "bank" ? "bank-book" : "cash-book"
}
