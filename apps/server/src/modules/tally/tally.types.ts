export interface TallySettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean
  tally_host: string
  tally_port: number
  company_name: string | null
  sync_sales: boolean
  sync_purchase: boolean
  sync_receipt: boolean
  sync_payment: boolean
  sync_inventory: boolean
  sync_contacts: boolean
  sync_direction: string
  settings: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface TallySyncJob {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  job_type: string
  direction: string
  status: string
  requested_by: string
  started_at: Date | null
  finished_at: Date | null
  total_records: number
  success_count: number
  failed_count: number
  error_message: string | null
  payload: string | null
  created_at: Date
  updated_at: Date
}

export interface TallySyncItem {
  id: number
  uuid: string
  job_id: number
  module_key: string
  record_id: string | null
  record_uuid: string | null
  record_label: string | null
  tally_guid: string | null
  status: string
  error_message: string | null
  payload: string | null
  created_at: Date
  updated_at: Date
}

export interface TallyWorkspace {
  settings: TallySettings
  jobs: TallySyncJob[]
  items: TallySyncItem[]
}

export type TallySettingsInput = Partial<TallySettings> & { settings?: unknown }
export type TallySyncJobInput = Partial<TallySyncJob> & { payload?: unknown }
