export type AccountLedgerType = 'cash' | 'bank' | 'fixed_asset'
export type AccountBookType = 'cash' | 'bank'
export type AccountEntryDirection = 'in' | 'out'

export interface AccountLedger {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  path: string
  account_type: AccountLedgerType
  code: string
  name: string
  opening_balance: number
  current_balance: number
  status: string
  is_active: boolean | number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface AccountBookComment {
  id: number
  uuid: string
  entry_id: number
  author_email: string
  body: string
  created_at: Date | string
}

export interface AccountBookActivity {
  id: number
  uuid: string
  entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string | null
  created_at: Date | string
}

export interface AccountBookEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  ledger_id: number
  book_type: AccountBookType
  voucher_no: string
  voucher_date: Date | string
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
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  comments: AccountBookComment[]
  activities: AccountBookActivity[]
}

export interface AccountBookEntryInput {
  id?: number
  uuid?: string
  company_id?: number
  accounting_year_id?: number
  ledger_id?: number
  book_type?: AccountBookType
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

export interface AccountLedgerInput {
  id?: number
  uuid?: string
  account_type?: AccountLedgerType
  code?: string | null
  name?: string | null
  opening_balance?: number | string | null
  status?: string | null
  is_active?: boolean | number
}
