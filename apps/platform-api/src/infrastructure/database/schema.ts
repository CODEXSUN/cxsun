import type { Generated } from 'kysely'

export interface IndustriesTable {
  id: Generated<number>
  code: string
  name: string
  status: string
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantsTable {
  id: Generated<number>
  code: number
  corporate_id: string | null
  mobile: string | null
  slug: string
  name: string
  status: string
  db_type: string
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantDomainsTable {
  id: Generated<number>
  tenant_id: number
  domain: string
  label: string
  is_primary: number
  status: string
  settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface AdminUsersTable {
  id: Generated<number>
  name: string
  email: string
  password_hash: string
  role: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface RbacPoliciesTable {
  id: Generated<number>
  code: string
  name: string
  description: string
  created_at: Generated<string>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  tenant_id: number
  policy_code: string
  enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface PlatformServiceTokensTable {
  id: Generated<number>
  name: string
  token_hash: string
  service_code: string
  scopes: string
  status: string
  last_used_at: string | null
  expires_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface PlatformAuditEventsTable {
  id: Generated<number>
  actor_type: string
  actor_id: string | null
  event_type: string
  target_type: string
  target_id: string | null
  tenant_id: number | null
  payload: string
  created_at: Generated<string>
}

export interface PlatformNotificationsTable {
  id: Generated<number>
  tenant_id: number | null
  user_id: number | null
  channel: string
  subject: string
  body: string
  payload: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface PlatformMailRequestsTable {
  id: Generated<number>
  tenant_id: number | null
  to_email: string
  subject: string
  body: string
  payload: string
  status: string
  provider_ref: string | null
  error: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface PlatformFilesTable {
  id: Generated<number>
  tenant_id: number | null
  owner_type: string
  owner_id: string | null
  file_name: string
  mime_type: string
  size_bytes: number
  storage_key: string
  checksum: string | null
  metadata: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface PlatformAppsTable {
  id: Generated<number>
  code: string
  name: string
  category: string
  status: string
  metadata: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface QueueJobsTable {
  id: Generated<number>
  queue_name: string
  type: string
  payload: string
  status: string
  attempts: number
  progress: number
  result: string | null
  error: string | null
  run_at: string
  started_at: string | null
  finished_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface QueueRuntimeSettingsTable {
  setting_key: string
  setting_value: string
  updated_by: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface DatabaseSchema {
  industries: IndustriesTable
  tenants: TenantsTable
  tenant_domains: TenantDomainsTable
  admin_users: AdminUsersTable
  rbac_policies: RbacPoliciesTable
  tenant_rbac_policies: TenantRbacPoliciesTable
  platform_service_tokens: PlatformServiceTokensTable
  platform_audit_events: PlatformAuditEventsTable
  platform_notifications: PlatformNotificationsTable
  platform_mail_requests: PlatformMailRequestsTable
  platform_files: PlatformFilesTable
  platform_apps: PlatformAppsTable
  queue_jobs: QueueJobsTable
  queue_runtime_settings: QueueRuntimeSettingsTable
}
