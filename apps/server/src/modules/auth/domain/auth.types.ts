export interface LoginInput {
  email?: string
  password?: string
  tenantCode?: string
}

export interface AuthTenantAccess {
  id: number
  code: number
  slug: string
  name: string
  status: string
  role: string
}

export type PlatformUserStatus = 'active' | 'inactive' | 'suspend'

export interface TenantUserSummary {
  tenant_id: number
  tenant_code: number
  tenant_slug: string
  tenant_name: string
  tenant_status: string
  user_count: number
}

export interface TenantUserRecord {
  access_id: number
  user_id: number
  tenant_id: number
  tenant_code: number
  tenant_slug: string
  tenant_name: string
  name: string
  email: string
  role: string
  status: PlatformUserStatus
  created_at: string
  updated_at: string
  access_created_at: string
}

export interface PlatformUserUpsertInput {
  access_id?: number
  user_id?: number
  tenant_id?: number
  tenantId?: number
  name?: string
  email?: string
  password?: string
  role?: string
  status?: PlatformUserStatus
}
