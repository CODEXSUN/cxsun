import { authHeaders, platformApiBaseUrl, type AuthSession } from "src/features/auth/auth-client"

export interface PlatformPolicy { id: number; code: string; name: string; description: string }
export interface PlatformApp { id: number; code: string; name: string; category: string; status: string; metadata: string }
export interface ServiceTokenSummary { id: number; name: string; service_code: string; scopes: string; status: string; last_used_at: string | null; expires_at: string | null }
export interface AuditEvent { id: number; event_type: string; target_type: string; target_id: string | null; tenant_id: number | null; actor_type: string; actor_id: string | null; created_at: string }
export interface NotificationRow { id: number; channel: string; subject: string; status: string; tenant_id: number | null; created_at: string }
export interface MailRequestRow { id: number; to_email: string; subject: string; status: string; tenant_id: number | null; created_at: string }
export interface FileMetadataRow { id: number; owner_type: string; owner_id: string | null; file_name: string; storage_key: string; status: string; tenant_id: number | null; created_at: string }

export async function listPlatformFoundation(session: AuthSession) {
  const [policies, apps, tokens, auditEvents, notifications, mailRequests, files] = await Promise.all([
    apiGet<PlatformPolicy[]>(session, "/api/v1/rbac/policies"),
    apiGet<PlatformApp[]>(session, "/api/v1/app-registry"),
    apiGet<ServiceTokenSummary[]>(session, "/api/v1/service-tokens"),
    apiGet<AuditEvent[]>(session, "/api/v1/audit-events?limit=20"),
    apiGet<NotificationRow[]>(session, "/api/v1/notifications?limit=20"),
    apiGet<MailRequestRow[]>(session, "/api/v1/mail-requests?limit=20"),
    apiGet<FileMetadataRow[]>(session, "/api/v1/files?limit=20"),
  ])

  return { policies, apps, tokens, auditEvents, notifications, mailRequests, files }
}

export async function createServiceToken(session: AuthSession, input: { name: string; service_code: string; scopes: string[] }) {
  return apiPost<{ ok: boolean; serviceToken?: ServiceTokenSummary & { token: string }; error?: string }>(session, "/api/v1/service-tokens", input)
}

export async function upsertPlatformApp(session: AuthSession, input: { code: string; name: string; category: string }) {
  return apiPost<{ ok: boolean; error?: string }>(session, "/api/v1/app-registry/upsert", { ...input, metadata: { source: "frontend" } })
}

export async function upsertPlatformPolicy(session: AuthSession, input: { code: string; name: string; description: string }) {
  return apiPost<{ ok: boolean; error?: string }>(session, "/api/v1/rbac/policies/upsert", input)
}

export async function processPlatformOutbox(session: AuthSession) {
  return apiPost<{ processed: number }>(session, "/api/v1/outbox/process", { limit: 50 })
}

async function apiGet<T>(session: AuthSession, path: string) {
  const response = await fetch(`${platformApiBaseUrl}${path}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Platform API request failed with status ${response.status}.`)
  return await response.json() as T
}

async function apiPost<T>(session: AuthSession, path: string, body: unknown) {
  const response = await fetch(`${platformApiBaseUrl}${path}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Platform API request failed with status ${response.status}.`)
  return await response.json() as T
}
