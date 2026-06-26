import { frappeApiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface FrappeSettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean | number
  base_url: string
  site_name: string | null
  api_key: string | null
  api_secret: string | null
  default_company: string | null
  default_warehouse: string | null
  timeout_seconds: number
  sync_contacts: boolean | number
  sync_products: boolean | number
  sync_sales: boolean | number
  sync_purchase: boolean | number
  settings: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
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
  last_synced_at: string | null
  last_error: string | null
  payload: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
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

export type FrappeSettingsInput = Omit<Partial<FrappeSettings>, "settings"> & { settings?: unknown }

export async function getFrappeWorkspace(session: AuthSession) {
  const response = await fetch(`${frappeApiBaseUrl}/api/v1/frappe`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Frappe workspace failed with status ${response.status}.`)
  return (await response.json()) as FrappeWorkspace
}

export async function saveFrappeSettings(session: AuthSession, input: FrappeSettingsInput) {
  const response = await fetch(`${frappeApiBaseUrl}/api/v1/frappe/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Frappe settings save failed"))
  return (await response.json()) as { ok: boolean; settings: FrappeSettings; workspace: FrappeWorkspace }
}

export async function validateFrappeConnection(session: AuthSession, input: FrappeSettingsInput) {
  const response = await fetch(`${frappeApiBaseUrl}/api/v1/frappe/validate-connection`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Frappe connection validation failed"))
  return (await response.json()) as { ok: boolean; validation: FrappeConnectionValidation; settings: FrappeSettings; workspace: FrappeWorkspace }
}

export async function getFrappeRecords(session: AuthSession, input: { doctype: string; limit: number; fields?: string }) {
  const url = new URL(`${frappeApiBaseUrl}/api/v1/frappe/records`)
  url.searchParams.set("doctype", input.doctype)
  url.searchParams.set("limit", String(input.limit))
  if (input.fields) url.searchParams.set("fields", input.fields)
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Frappe records fetch failed"))
  return (await response.json()) as { ok: boolean; doctype: string; direction: "get"; status: number; latency_ms: number; data: unknown }
}

export async function postFrappeRecord(session: AuthSession, input: { doctype: string; data: unknown }) {
  const response = await fetch(`${frappeApiBaseUrl}/api/v1/frappe/records`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Frappe record post failed"))
  return (await response.json()) as { ok: boolean; doctype: string; direction: "post"; status: number; latency_ms: number; data: unknown }
}

export async function createFrappeSyncJob(session: AuthSession, input: { job_type?: string; direction?: string; payload?: unknown } = {}) {
  const response = await fetch(`${frappeApiBaseUrl}/api/v1/frappe/sync-jobs`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Frappe sync job failed"))
  return (await response.json()) as { ok: boolean; workspace: FrappeWorkspace }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error || payload.message || `${fallback} with status ${response.status}.`
  } catch {
    return `${fallback} with status ${response.status}.`
  }
}
