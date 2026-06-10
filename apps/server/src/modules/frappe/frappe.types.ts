export interface FrappeSettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean
  base_url: string
  site_name: string | null
  api_key: string | null
  api_secret: string | null
  default_company: string | null
  default_warehouse: string | null
  timeout_seconds: number
  sync_contacts: boolean
  sync_products: boolean
  sync_sales: boolean
  sync_purchase: boolean
  settings: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface FrappeSyncJob {
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

export interface FrappeRecordLink {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  doctype: string
  local_module: string | null
  local_record_uuid: string | null
  remote_name: string | null
  record_label: string | null
  direction: string
  status: string
  last_synced_at: Date | null
  last_error: string | null
  payload: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface FrappeWorkspace {
  settings: FrappeSettings
  jobs: FrappeSyncJob[]
  links: FrappeRecordLink[]
}

export interface FrappeConnectionValidation {
  ok: boolean
  endpoint: string
  site_name: string | null
  checked_at: string
  http_status: number | null
  authenticated_user: string | null
  latency_ms: number | null
  detail: string
  response_excerpt: string | null
}

export interface FrappeRemoteResourceResponse {
  ok: boolean
  doctype: string
  direction: 'get' | 'post'
  status: number
  latency_ms: number
  data: unknown
}

export type FrappeSettingsInput = Omit<Partial<FrappeSettings>, 'settings'> & { settings?: unknown }
export type FrappeSyncJobInput = Omit<Partial<FrappeSyncJob>, 'payload'> & { payload?: unknown }
export type FrappeResourcePostInput = { doctype?: string; data?: unknown }
