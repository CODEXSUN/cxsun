import type { Kysely } from 'kysely'
import { Injectable } from '../../core/decorators/injectable.js'
import { ForbiddenException, NotFoundException, UnauthorizedException } from '../../core/exceptions/http.exception.js'
import { verifyJwt } from '../../infrastructure/auth/jwt.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { TenantDatabaseSchema } from '../../infrastructure/tenant-database/tenant-database.schema.js'
import type { Tenant } from '../tenant/tenant.types.js'

const tenantColumns = [
  'id',
  'code',
  'corporate_id',
  'mobile',
  'slug',
  'name',
  'status',
  'db_type',
  'db_host',
  'db_port',
  'db_name',
  'db_user',
  'db_secret_ref',
  'company_count',
  'active_company_count',
  'company_concept_count',
  'payload_settings',
  'created_at',
  'updated_at',
  'deleted_at',
] as const

export interface TenantRequestHeaders {
  'x-tenant-code'?: string | string[]
  'x-user-email'?: string | string[]
  'x-login-domain'?: string | string[]
  'x-forwarded-host'?: string | string[]
  authorization?: string | string[]
  host?: string | string[]
}

export interface TenantRuntimeContext {
  tenant: Tenant
  user: {
    id: number
    email: string
    role: string
  }
  database: Kysely<TenantDatabaseSchema>
}

@Injectable()
export class TenantContextService {
  async resolve(headers: TenantRequestHeaders, requiredPolicy?: string): Promise<TenantRuntimeContext> {
    const auth = verifyJwt(bearerToken(firstHeader(headers.authorization)))
    if (!auth) throw new UnauthorizedException('Authentication is required.')

    const requestedTenantCode = firstHeader(headers['x-tenant-code'])
    const isSuperAdminToken = auth.superAdmin === true || auth.role === 'super-admin'
    const tenantCode = isSuperAdminToken && requestedTenantCode && !isPlatformDeskTenantCode(requestedTenantCode)
      ? requestedTenantCode
      : !isPlatformDeskTenantCode(auth.tenantCode)
        ? auth.tenantCode
        : undefined
    const tenant = tenantCode ? await findTenant(tenantCode) : await findTenantByDomain(loginDomainHeader(headers))
    if (!tenant) throw new NotFoundException('Tenant was not found.')

    const requestDomain = loginDomainHeader(headers)
    const requestDomainTenant = await findTenantByDomain(requestDomain)
    if (auth.identitySource === 'tenant' && requestDomain && !isLocalDomain(requestDomain) && !requestDomainTenant) {
      throw new UnauthorizedException('Tenant domain is not mapped.')
    }
    if (auth.identitySource === 'tenant' && requestDomainTenant && requestDomainTenant.slug !== tenant.slug) {
      throw new UnauthorizedException('Tenant session does not match this domain.')
    }

    if (tenant.status !== 'active' && !isSuperAdminToken) throw new ForbiddenException('Tenant is not active.')

    const database = getTenantDatabase(tenant)
    const access = auth.identitySource === 'platform'
      ? await resolvePlatformAccess(auth.email)
      : await resolveTenantAccess(database, auth.email)

    if (!access && !isSuperAdminToken) throw new ForbiddenException('User does not have access to this tenant.')
    if (!isTokenFresh(auth, access?.updated_at)) throw new UnauthorizedException('Session expired. Please login again.')

    const role = access?.role ?? auth.role ?? 'super-admin'
    return {
      tenant,
      user: {
        id: access?.user_id ?? auth.sub ?? 0,
        email: access?.email ?? auth.email,
        role,
      },
      database: await assertPolicies({
        database,
        isSuperAdmin: role === 'super-admin' || isSuperAdminToken,
        policyCode: requiredPolicy,
        role,
        tenantId: tenant.id,
      }),
    }
  }
}

async function resolvePlatformAccess(userEmail: string) {
  return getDatabase()
    .selectFrom('admin_users')
    .select(['admin_users.id as user_id', 'admin_users.email', 'admin_users.role', 'admin_users.updated_at'])
    .where('admin_users.email', '=', userEmail)
    .where('admin_users.status', '=', 'active')
    .executeTakeFirst()
}

async function resolveTenantAccess(database: Kysely<TenantDatabaseSchema>, userEmail: string) {
  return database
    .selectFrom('users')
    .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
    .select(['users.id as user_id', 'users.email', 'user_tenants.role', 'users.updated_at'])
    .where('users.email', '=', userEmail)
    .where('users.status', '=', 'active')
    .where('user_tenants.status', '=', 'active')
    .executeTakeFirst()
}

async function findTenant(value: string): Promise<Tenant | undefined> {
  const normalized = value.trim()
  const numericCode = Number(normalized)
  const query = getDatabase().selectFrom('tenants').select(tenantColumns)
  if (Number.isInteger(numericCode)) return query.where('code', '=', numericCode).executeTakeFirst() as Promise<Tenant | undefined>
  return query.where('slug', '=', normalized).executeTakeFirst() as Promise<Tenant | undefined>
}

async function findTenantByDomain(value: string): Promise<Tenant | undefined> {
  const domain = normalizeDomain(value)
  if (!domain) return undefined
  return getDatabase()
    .selectFrom('tenant_domains')
    .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
    .select(tenantColumns.map((column) => `tenants.${column}` as const))
    .where('tenant_domains.domain', '=', domain)
    .where('tenant_domains.status', '=', 'active')
    .where('tenant_domains.deleted_at', 'is', null)
    .executeTakeFirst() as Promise<Tenant | undefined>
}

async function assertPolicies({
  database,
  isSuperAdmin,
  policyCode,
  role,
  tenantId,
}: {
  database: Kysely<TenantDatabaseSchema>
  isSuperAdmin: boolean
  policyCode?: string
  role: string
  tenantId: number
}) {
  if (!policyCode || isSuperAdmin) return database

  const policy = await getDatabase()
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .where('enabled', '=', 1)
    .executeTakeFirst()
  if (!policy) throw new ForbiddenException(`Tenant policy is not enabled: ${policyCode}`)

  const rolePolicy = await database
    .selectFrom('rbac_role_policies')
    .select('id')
    .where('role_code', '=', role)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()
  if (!rolePolicy) throw new ForbiddenException(`Role policy is not enabled: ${policyCode}`)

  return database
}

function isPlatformDeskTenantCode(value?: string) {
  return value === 'super-admin' || value === 'admin'
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function loginDomainHeader(headers: TenantRequestHeaders) {
  return firstHeader(headers['x-login-domain']) ?? firstHeader(headers['x-forwarded-host']) ?? firstHeader(headers.host) ?? ''
}

function bearerToken(value?: string) {
  if (!value?.toLowerCase().startsWith('bearer ')) return undefined
  return value.slice('bearer '.length).trim()
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}

function isLocalDomain(value: string) {
  const domain = normalizeDomain(value)
  return ['localhost', '127.0.0.1', '::1'].includes(domain) || domain.endsWith('.local')
}

function isTokenFresh(auth: { iat?: number }, updatedAt?: Date | string) {
  if (!auth.iat) return false
  if (!updatedAt) return true
  return auth.iat >= timestampSeconds(updatedAt)
}

function timestampSeconds(value: Date | string) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0
}
