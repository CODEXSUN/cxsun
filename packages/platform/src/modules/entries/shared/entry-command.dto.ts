export type EntryCommandSource = 'api' | 'system' | 'queue' | 'super_admin'

export interface PostedDocumentCommand {
  command_id?: string
  reason?: string
  requested_by?: string
  source?: EntryCommandSource
}

export interface PostVoucherCommand extends PostedDocumentCommand {
  posting_date?: string
}

export interface ReverseDocumentCommand extends PostedDocumentCommand {
  reversal_date?: string
}

export interface CreateCorrectionCommand extends PostedDocumentCommand {
  correction_date?: string
}

export interface CancelComplianceCommand extends PostedDocumentCommand {
  cancel_reason_code?: string
  cancel_remarks?: string
}

export interface RecalculatePostingCommand extends PostedDocumentCommand {
  accounting_year_id?: number | string
  source_module?: string
}

export interface RecalculateReportTablesCommand extends PostedDocumentCommand {
  accounting_year_id?: number | string
  report?: 'all' | 'trial_balance' | 'profit_loss' | 'balance_sheet' | 'day_book' | 'cash_book' | 'bank_book'
}

export interface EntryCommandResult<TRecord = unknown> {
  affected_ids?: Array<number | string>
  audit_ids?: Array<number | string>
  command_id?: string | null
  ok: boolean
  record?: TRecord
}

export function commandReasonSuffix(command?: PostedDocumentCommand) {
  const reason = String(command?.reason ?? '').trim()
  return reason ? ` Reason: ${reason}` : ''
}

export function commandId(command?: PostedDocumentCommand) {
  const id = String(command?.command_id ?? '').trim()
  return id || null
}
