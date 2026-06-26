export interface PaymentAllocation {
  id?: number
  payment_entry_id?: number
  document_type: string
  document_id?: string | null
  document_no: string
  document_date?: string | Date | null
  document_total: number
  previous_balance: number
  allocated_amount: number
  balance_after_allocation?: number
  sort_order?: number
}

export interface PaymentComment {
  id: number
  uuid: string
  payment_entry_id: number
  author_email: string
  body: string
  created_at: Date | string
}

export interface PaymentActivity {
  id: number
  uuid: string
  payment_entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Date | string
}

export interface PaymentEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  payment_no: string
  payment_date: string | Date
  party_id: string | null
  party_name: string
  party_type: string | null
  ledger_id: string | null
  ledger_name: string | null
  payment_mode: string
  bank_account_id: string | null
  reference_no: string | null
  reference_date: string | Date | null
  amount: number
  tds_amount: number
  discount_amount: number
  round_off: number
  net_amount: number
  allocated_amount: number
  unallocated_amount: number
  status: string
  notes: string | null
  is_active: boolean | number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  allocations: PaymentAllocation[]
  comments: PaymentComment[]
  activities: PaymentActivity[]
}

export interface PaymentEntryInput {
  id?: number
  uuid?: string
  company_id?: number
  accounting_year_id?: number
  payment_no?: string
  payment_date?: string
  party_id?: string | null
  party_name?: string | null
  party_type?: string | null
  ledger_id?: string | null
  ledger_name?: string | null
  payment_mode?: string | null
  bank_account_id?: string | null
  reference_no?: string | null
  reference_date?: string | null
  amount?: number
  tds_amount?: number
  discount_amount?: number
  round_off?: number
  status?: string
  notes?: string | null
  is_active?: boolean | number
  allocations?: PaymentAllocation[]
}
