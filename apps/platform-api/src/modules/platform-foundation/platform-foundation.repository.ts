import { randomBytes, createHash } from 'crypto'
import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { nowIso } from '../../infrastructure/database/database-module.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { Tenant } from '../tenant/tenant.types.js'
import type { AppInput, AuditEventInput, FileMetadataInput, MailRequestInput, NotificationInput, PolicyInput, ServiceTokenInput, TenantAppsInput, TenantPolicyInput } from './platform-foundation.types.js'

@Injectable()
export class PlatformFoundationRepository {
  listPolicies() {
    return getDatabase().selectFrom('rbac_policies').selectAll().orderBy('code', 'asc').execute()
  }

  async upsertPolicy(input: Required<PolicyInput>) {
    const existing = await getDatabase().selectFrom('rbac_policies').select('id').where('code', '=', input.code).executeTakeFirst()
    if (existing) {
      await getDatabase().updateTable('rbac_policies').set({ name: input.name, description: input.description }).where('id', '=', existing.id).execute()
      return getDatabase().selectFrom('rbac_policies').selectAll().where('id', '=', existing.id).executeTakeFirstOrThrow()
    }
    await getDatabase().insertInto('rbac_policies').values(input).execute()
    return getDatabase().selectFrom('rbac_policies').selectAll().where('code', '=', input.code).executeTakeFirstOrThrow()
  }

  listTenantPolicies(tenantId: number) {
    return getDatabase()
      .selectFrom('tenant_rbac_policies')
      .leftJoin('rbac_policies', 'rbac_policies.code', 'tenant_rbac_policies.policy_code')
      .select(['tenant_rbac_policies.id', 'tenant_rbac_policies.tenant_id', 'tenant_rbac_policies.policy_code', 'tenant_rbac_policies.enabled', 'rbac_policies.name', 'rbac_policies.description'])
      .where('tenant_rbac_policies.tenant_id', '=', tenantId)
      .orderBy('tenant_rbac_policies.policy_code', 'asc')
      .execute()
  }

  async upsertTenantPolicy(tenantId: number, input: Required<TenantPolicyInput>) {
    const existing = await getDatabase().selectFrom('tenant_rbac_policies').select('id').where('tenant_id', '=', tenantId).where('policy_code', '=', input.policy_code).executeTakeFirst()
    const row = { tenant_id: tenantId, policy_code: input.policy_code, enabled: input.enabled ? 1 : 0, updated_at: nowIso() }
    if (existing) await getDatabase().updateTable('tenant_rbac_policies').set(row).where('id', '=', existing.id).execute()
    else await getDatabase().insertInto('tenant_rbac_policies').values(row).execute()
    return this.listTenantPolicies(tenantId)
  }

  async checkTenantRolePolicy(tenant: Tenant, role: string, policyCode: string) {
    const tenantPolicy = await getDatabase()
      .selectFrom('tenant_rbac_policies')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .where('policy_code', '=', policyCode)
      .where('enabled', '=', 1)
      .executeTakeFirst()
    if (!tenantPolicy) return false
    const rolePolicy = await getTenantDatabase(tenant)
      .selectFrom('rbac_role_policies')
      .select('id')
      .where('role_code', '=', role)
      .where('policy_code', '=', policyCode)
      .executeTakeFirst()
    return Boolean(rolePolicy)
  }

  findTenantById(id: number) {
    return getDatabase().selectFrom('tenants').selectAll().where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst() as Promise<Tenant | undefined>
  }

  async listTenantCompanies(tenant: Tenant) {
    return getTenantDatabase(tenant).selectFrom('companies').selectAll().where('deleted_at', 'is', null).orderBy('name', 'asc').execute()
  }

  async listTenantAccountingYears(tenant: Tenant) {
    return getTenantDatabase(tenant).selectFrom('accounting_years').selectAll().where('deleted_at', 'is', null).orderBy('start_date', 'desc').execute()
  }

  listApps() {
    return getDatabase().selectFrom('platform_apps').selectAll().orderBy('category', 'asc').orderBy('name', 'asc').execute()
  }

  async upsertApp(input: Required<AppInput>) {
    const existing = await getDatabase().selectFrom('platform_apps').select('id').where('code', '=', input.code).executeTakeFirst()
    const row = { ...input, metadata: JSON.stringify(input.metadata ?? {}), updated_at: nowIso() }
    if (existing) {
      await getDatabase().updateTable('platform_apps').set(row).where('id', '=', existing.id).execute()
      return getDatabase().selectFrom('platform_apps').selectAll().where('id', '=', existing.id).executeTakeFirstOrThrow()
    }
    await getDatabase().insertInto('platform_apps').values(row).execute()
    return getDatabase().selectFrom('platform_apps').selectAll().where('code', '=', input.code).executeTakeFirstOrThrow()
  }

  async getTenantApps(tenantId: number) {
    const tenant = await this.findTenantById(tenantId)
    if (!tenant) return undefined
    const settings = parseObject(tenant.payload_settings)
    return { tenantId, apps: settings.apps ?? { enabled: [], landing: '' }, settings }
  }

  async updateTenantApps(tenantId: number, input: Required<TenantAppsInput>) {
    const tenant = await this.findTenantById(tenantId)
    if (!tenant) return undefined
    const settings = parseObject(tenant.payload_settings)
    settings.apps = { ...(parseObject(settings.apps)), enabled: input.enabled, landing: input.landing }
    await getDatabase().updateTable('tenants').set({ payload_settings: JSON.stringify(settings), updated_at: nowIso() }).where('id', '=', tenantId).execute()
    return this.getTenantApps(tenantId)
  }

  async createServiceToken(input: Required<ServiceTokenInput>) {
    const token = `cxs_${input.service_code}_${randomBytes(24).toString('base64url')}`
    const token_hash = hashSecret(token)
    await getDatabase().insertInto('platform_service_tokens').values({
      name: input.name,
      service_code: input.service_code,
      scopes: JSON.stringify(input.scopes),
      token_hash,
      status: 'active',
      expires_at: input.expires_at,
    }).execute()
    const row = await getDatabase().selectFrom('platform_service_tokens').select(['id', 'name', 'service_code', 'scopes', 'status', 'expires_at', 'created_at']).where('token_hash', '=', token_hash).executeTakeFirstOrThrow()
    return { ...row, token }
  }

  listServiceTokens() {
    return getDatabase().selectFrom('platform_service_tokens').select(['id', 'name', 'service_code', 'scopes', 'status', 'last_used_at', 'expires_at', 'created_at', 'updated_at']).orderBy('id', 'desc').execute()
  }

  async verifyServiceToken(token: string) {
    const row = await getDatabase().selectFrom('platform_service_tokens').selectAll().where('token_hash', '=', hashSecret(token)).where('status', '=', 'active').executeTakeFirst()
    if (!row) return undefined
    if (row.expires_at && Date.parse(row.expires_at) < Date.now()) return undefined
    await getDatabase().updateTable('platform_service_tokens').set({ last_used_at: nowIso(), updated_at: nowIso() }).where('id', '=', row.id).execute()
    return { id: row.id, service_code: row.service_code, scopes: safeArray(row.scopes), name: row.name }
  }

  async createAuditEvent(input: Required<AuditEventInput>) {
    await getDatabase().insertInto('platform_audit_events').values({ ...input, payload: JSON.stringify(input.payload) }).execute()
    return getDatabase().selectFrom('platform_audit_events').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirstOrThrow()
  }

  listAuditEvents(limit = 50) {
    return getDatabase().selectFrom('platform_audit_events').selectAll().orderBy('id', 'desc').limit(limit).execute()
  }

  async createNotification(input: Required<NotificationInput>) {
    await getDatabase().insertInto('platform_notifications').values({ ...input, status: 'pending', payload: JSON.stringify(input.payload), updated_at: nowIso() }).execute()
    return getDatabase().selectFrom('platform_notifications').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirstOrThrow()
  }

  listNotifications(limit = 50) {
    return getDatabase().selectFrom('platform_notifications').selectAll().orderBy('id', 'desc').limit(limit).execute()
  }

  async createMailRequest(input: Required<MailRequestInput>) {
    await getDatabase().insertInto('platform_mail_requests').values({ ...input, status: 'queued', payload: JSON.stringify(input.payload), updated_at: nowIso() }).execute()
    return getDatabase().selectFrom('platform_mail_requests').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirstOrThrow()
  }

  listMailRequests(limit = 50) {
    return getDatabase().selectFrom('platform_mail_requests').selectAll().orderBy('id', 'desc').limit(limit).execute()
  }

  async createFileMetadata(input: Required<FileMetadataInput>) {
    await getDatabase().insertInto('platform_files').values({ ...input, status: 'active', metadata: JSON.stringify(input.metadata), updated_at: nowIso() }).execute()
    return getDatabase().selectFrom('platform_files').selectAll().orderBy('id', 'desc').limit(1).executeTakeFirstOrThrow()
  }

  listFiles(limit = 50) {
    return getDatabase().selectFrom('platform_files').selectAll().orderBy('id', 'desc').limit(limit).execute()
  }

  async processQueue(limit = 20) {
    const jobs = await getDatabase().selectFrom('queue_jobs').selectAll().where('status', '=', 'pending').orderBy('run_at', 'asc').limit(limit).execute()
    for (const job of jobs) {
      await getDatabase().updateTable('queue_jobs').set({
        status: 'completed',
        progress: 100,
        result: JSON.stringify({ processedBy: 'platform-api', processedAt: new Date().toISOString() }),
        started_at: job.started_at ?? nowIso(),
        finished_at: nowIso(),
        updated_at: nowIso(),
      }).where('id', '=', job.id).execute()
    }
    return { processed: jobs.length, jobs }
  }
}

export function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function parseObject(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>
  try {
    const parsed = JSON.parse(String(value)) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {}
  } catch {
    return {}
  }
}

function safeArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
