import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface TallySettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean | number
  tally_host: string
  tally_port: number
  company_name: string | null
  sync_sales: boolean | number
  sync_purchase: boolean | number
  sync_receipt: boolean | number
  sync_payment: boolean | number
  sync_inventory: boolean | number
  sync_contacts: boolean | number
  sync_direction: string
  settings: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
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
  started_at: string | null
  finished_at: string | null
  total_records: number
  success_count: number
  failed_count: number
  error_message: string | null
  payload: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

export interface TallyWorkspace {
  settings: TallySettings
  jobs: TallySyncJob[]
  items: TallySyncItem[]
}

export type TallySettingsInput = Partial<TallySettings> & { settings?: unknown }

export async function getTallyWorkspace(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tally workspace failed with status ${response.status}.`)
  return (await response.json()) as TallyWorkspace
}

export async function saveTallySettings(session: AuthSession, input: TallySettingsInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally settings save failed"))
  return (await response.json()) as { ok: boolean; settings: TallySettings; workspace: TallyWorkspace }
}

export async function createTallySyncJob(session: AuthSession, input: { job_type?: string; direction?: string; payload?: unknown } = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/sync-jobs`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally sync job failed"))
  return (await response.json()) as { ok: boolean; workspace: TallyWorkspace }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error || payload.message || `${fallback} with status ${response.status}.`
  } catch {
    return `${fallback} with status ${response.status}.`
  }
}
