export interface PolicyInput {
  code?: string
  name?: string
  description?: string
}

export interface TenantPolicyInput {
  policy_code?: string
  enabled?: boolean | number
}

export interface AppInput {
  code?: string
  name?: string
  category?: string
  status?: string
  metadata?: Record<string, unknown>
}

export interface TenantAppsInput {
  enabled?: string[]
  landing?: string
}

export interface ServiceTokenInput {
  name?: string
  service_code?: string
  scopes?: string[]
  expires_at?: string | null
}

export interface AuditEventInput {
  actor_type?: string
  actor_id?: string | null
  event_type?: string
  target_type?: string
  target_id?: string | null
  tenant_id?: number | null
  payload?: Record<string, unknown>
}

export interface NotificationInput {
  tenant_id?: number | null
  user_id?: number | null
  channel?: string
  subject?: string
  body?: string
  payload?: Record<string, unknown>
}

export interface MailRequestInput {
  tenant_id?: number | null
  to_email?: string
  subject?: string
  body?: string
  payload?: Record<string, unknown>
}

export interface FileMetadataInput {
  tenant_id?: number | null
  owner_type?: string
  owner_id?: string | null
  file_name?: string
  mime_type?: string
  size_bytes?: number
  storage_key?: string
  checksum?: string | null
  metadata?: Record<string, unknown>
}
