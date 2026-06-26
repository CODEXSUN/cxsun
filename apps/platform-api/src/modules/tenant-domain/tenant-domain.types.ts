export type TenantDomainStatus = 'active' | 'not_active' | 'suspend'
export type PlatformTenantStatus = 'active' | 'not_active' | 'suspend'

export interface TenantDomain {
  id: number
  tenant_id: number
  tenant_slug: string
  tenant_name: string
  domain: string
  label: string
  is_primary: number
  status: TenantDomainStatus
  settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TenantDomainResolution {
  ok: boolean
  error?: string
  domain?: {
    id: number
    domain: string
    label: string
    isPrimary: boolean
    status: TenantDomainStatus
    settings?: Record<string, unknown>
  }
  tenant?: PlatformResolvedTenant
}

export interface PlatformResolvedTenant {
  id: number
  code: string
  corporate_id: string
  mobile: string
  slug: string
  name: string
  status: PlatformTenantStatus
  db_type: 'mariadb'
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string | null
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  database: string
  settings: Record<string, unknown>
  industryKey?: string | null
  industryName?: string | null
  liveScope?: {
    companies: string[]
    requirements: string[]
    notes: string
    domains: string[]
  }
  features: string[]
  apps?: {
    enabled: string[]
    landing: string
  }
}

export interface TenantDomainUpsertInput {
  id?: number
  tenant_id?: number
  tenantId?: number
  domain?: string
  label?: string
  is_primary?: number | boolean
  isPrimary?: number | boolean
  status?: TenantDomainStatus
  settings?: string | Record<string, unknown>
}

export interface TenantDomainDeleteInput {
  force?: boolean
  confirmation?: string
}
