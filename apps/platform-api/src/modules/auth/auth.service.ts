import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { signJwt, verifyJwt } from '../../infrastructure/auth/jwt.js'
import { verifyPassword } from '../../infrastructure/auth/password-hash.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { Tenant } from '../tenant/tenant.types.js'
import { AuthRepository } from './auth.repository.js'
import type { AuthTenantAccess, LoginInput } from './auth.types.js'
import type { TenantRequestHeaders } from './tenant-context.service.js'

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly auth: AuthRepository,
  ) {}

  async login(input: LoginInput, headers: TenantRequestHeaders = {}) {
    const email = input.email?.trim().toLowerCase()
    const password = input.password ?? ''
    const corporateId = input.corporateId?.trim() ?? ''
    const surface = input.surface ?? 'tenant'

    if (!email || !password) return { ok: false, error: 'Email and password are required.' }
    if (surface !== 'tenant') return this.loginPlatformUser({ email, password, surface })
    if (!corporateId) return { ok: false, error: 'Corporate ID or mobile, email, and password are required.' }

    const loginTenant = await this.auth.findTenantByLoginIdentifier(corporateId).catch(() => undefined)
    if (!loginTenant || loginTenant.status !== 'active') return { ok: false, error: 'Invalid login details.' }

    const domainTenantSlug = await this.resolveLoginDomainTenant(headers).catch(() => '__unmapped_domain__')
    if (domainTenantSlug && domainTenantSlug !== loginTenant.slug) return { ok: false, error: 'Invalid login details.' }

    return this.loginTenantUser({ email, password, loginTenant })
  }

  async session(headers: TenantRequestHeaders = {}) {
    const authHeader = firstHeader(headers.authorization)
    if (!authHeader?.startsWith('Bearer ')) return { ok: false, error: 'Session token is required.' }

    const token = authHeader.slice(7)
    const payload = verifyJwt(token)
    if (!payload) return { ok: false, error: 'Session token is invalid.' }

    if (payload.identitySource === 'platform') {
      return {
        ok: true,
        token,
        user: { id: payload.sub, name: payload.email, email: payload.email },
        tenants: [platformTenant(payload.role)],
        selectedTenant: platformTenant(payload.role),
      }
    }

    const loginTenant = await this.auth.findTenantBySlug(payload.tenantCode).catch(() => undefined)
    if (!loginTenant || loginTenant.status !== 'active') return { ok: false, error: 'Tenant session is no longer active.' }

    const user = await getTenantDatabase(loginTenant)
      .selectFrom('users')
      .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
      .select(['users.id', 'users.name', 'users.email', 'user_tenants.role', 'users.status'])
      .where('users.id', '=', payload.sub)
      .where('users.email', '=', payload.email)
      .where('user_tenants.status', '=', 'active')
      .executeTakeFirst()
      .catch(() => undefined)

    if (!user || user.status !== 'active' || user.role !== payload.role) return { ok: false, error: 'Tenant session is no longer valid.' }

    const selectedTenant = { ...loginTenant, role: user.role }
    return {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenants: [selectedTenant],
      selectedTenant,
    }
  }

  private async resolveLoginDomainTenant(headers: TenantRequestHeaders) {
    const loginDomain = firstHeader(headers['x-login-domain']) ?? firstHeader(headers['x-forwarded-host']) ?? firstHeader(headers.host)
    if (!loginDomain || isLocalDomain(loginDomain)) return undefined
    const tenantSlug = await this.auth.findTenantSlugByDomain(loginDomain)
    return tenantSlug ?? '__unmapped_domain__'
  }

  private async loginTenantUser({ email, password, loginTenant }: { email: string; password: string; loginTenant: Tenant }) {
    const user = await getTenantDatabase(loginTenant)
      .selectFrom('users')
      .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
      .select(['users.id', 'users.name', 'users.email', 'users.password_hash', 'user_tenants.role', 'users.status'])
      .where('email', '=', email)
      .where('user_tenants.status', '=', 'active')
      .executeTakeFirst()
      .catch(() => undefined)

    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) return { ok: false, error: 'Invalid login details.' }

    const selectedTenant = { ...loginTenant, role: user.role }
    const token = signJwt({ sub: user.id, email: user.email, role: user.role, tenantCode: loginTenant.slug, identitySource: 'tenant', superAdmin: false })
    return { ok: true, token, user: { id: user.id, name: user.name, email: user.email }, tenants: [selectedTenant], selectedTenant }
  }

  private async loginPlatformUser({ email, password, surface }: { email: string; password: string; surface: 'admin' | 'super-admin' }) {
    const user = await this.auth.findAdminUserByEmail(email)
    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) return { ok: false, error: 'Invalid login details.' }

    const selectedTenant = platformTenant(user.role)
    const token = signJwt({ sub: user.id, email: user.email, role: user.role, tenantCode: selectedTenant.slug, identitySource: 'platform', superAdmin: user.role === 'super-admin' })
    if (!roleMatchesSurface(user.role, surface)) return { ok: false, error: 'Invalid login details.' }
    return { ok: true, token, user: { id: user.id, name: user.name, email: user.email }, tenants: [selectedTenant], selectedTenant }
  }
}

function platformTenant(role: string): AuthTenantAccess {
  const isSuperAdmin = role === 'super-admin'
  return { id: 0, code: 0, corporate_id: null, mobile: null, slug: isSuperAdmin ? 'super-admin' : 'admin', name: isSuperAdmin ? 'Super Admin Desk' : 'Admin Desk', status: 'active', role }
}

function roleMatchesSurface(role: string, surface: 'admin' | 'super-admin') {
  if (surface === 'super-admin') return role === 'super-admin'
  return ['software-admin', 'support-admin', 'helpdesk-admin'].includes(role)
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function isLocalDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
  return ['localhost', '127.0.0.1', '::1'].includes(domain) || domain.endsWith('.local')
}
