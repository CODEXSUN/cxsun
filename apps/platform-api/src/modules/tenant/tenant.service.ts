import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { getTenantDatabase, setupTenantClientDatabase, tenantDatabaseExists, dropTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import { getDatabase } from '../.././infrastructure/database/connection.js'
import { nowIso } from '../../infrastructure/database/database-module.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { createPlatformEvent, PlatformEventBus } from '../../events.js'
import { platformSyncTags } from '../../sync-tags.js'
import { TenantAggregate, TenantValidationError } from './tenant.aggregate.js'
import { TenantEventLog } from './tenant-event-log.js'
import { TenantRepository } from './tenant.repository.js'
import type { TenantUpsertInput } from './tenant.types.js'

export type TenantInput = TenantUpsertInput

@Injectable()
export class TenantService {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
    @Inject(PlatformEventBus) private readonly eventBus: PlatformEventBus,
    @Inject(TenantEventLog) private readonly eventLog: TenantEventLog,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  list() {
    return this.tenants.list()
  }

  async upsert(input: TenantInput) {
    try {
      const payload = TenantAggregate.normalize(input, await this.tenants.nextCode())

      if (input.id) {
        const existing = await this.tenants.findById(input.id)
        if (!existing) return { ok: false, error: 'Tenant was not found.' }
        const duplicate = await this.findDuplicate(payload, input.id)
        if (duplicate) return duplicate

        const tenant = await this.tenants.update(input.id, payload)
        await this.publishTenantEvent('platform.tenant.updated', tenant.id, tenant.code)
        return { ok: true, tenant }
      }

      const duplicate = await this.findDuplicate(payload)
      if (duplicate) return duplicate

      const tenant = await this.tenants.insert(payload)
      await this.publishTenantEvent('platform.tenant.created', tenant.id, tenant.code)
      await this.queue.enqueue({
        type: 'platform.tenant.database.provision',
        payload: { tenantId: tenant.id, tenantSlug: tenant.slug, database: tenant.db_name },
      })

      return { ok: true, tenant }
    } catch (error) {
      if (error instanceof TenantValidationError) return { ok: false, error: error.message }
      throw error
    }
  }

  async softDelete(id: number) {
    const tenant = await this.tenants.findById(id)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }

    const deleted = await this.tenants.softDelete(id)
    if (!deleted) return { ok: false, error: 'Tenant was not found.' }

    await this.publishTenantEvent('platform.tenant.deleted', tenant.id, tenant.code)
    return { ok: true }
  }

  async restore(id: number) {
    const tenant = await this.tenants.findAnyById(id)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    if (!tenant.deleted_at) return { ok: true }

    const restored = await this.tenants.restore(id)
    if (!restored) return { ok: false, error: 'Tenant was not found.' }

    await this.publishTenantEvent('platform.tenant.restored', tenant.id, tenant.code)
    return { ok: true }
  }

  async setupStatus(id: number) {
    const tenant = await this.tenants.findActiveById(id)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    return {
      ok: true,
      tenantId: tenant.id,
      database: tenant.db_name,
      databaseExists: await tenantDatabaseExists(tenant),
      hasDefaultCompany: tenant.active_company_count > 0,
    }
  }

  async setupClient(id: number) {
    const tenant = await this.tenants.findActiveById(id)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    await ensureTenantPolicies(tenant.id)
    return setupTenantClientDatabase(tenant)
  }

  async resetDatabase(id: number, confirmation: string) {
    const tenant = await this.tenants.findActiveById(id)
    if (!tenant) return { ok: false, error: 'Tenant was not found.' }
    if (confirmation.trim().toLowerCase() !== tenant.slug) {
      return { ok: false, error: `Type ${tenant.slug} to confirm tenant database reset.` }
    }
    await dropTenantDatabase(tenant)
    await ensureTenantPolicies(tenant.id)
    return setupTenantClientDatabase(tenant)
  }

  async context(tenantCode?: string | string[], host?: string | string[]) {
    const requestedTenant = Array.isArray(tenantCode) ? tenantCode[0] : tenantCode
    const requestedHost = Array.isArray(host) ? host[0] : host
    const tenant = requestedTenant
      ? await this.tenants.findForResolution(requestedTenant)
      : await this.tenants.findByDomain(requestedHost ?? '')

    if (!tenant) return { ok: false, error: 'Tenant context was not found.' }

    const policies = await this.tenants.listEnabledPolicyCodes(tenant.id)
    const companies = []
    let ready = false
    let databaseError: string | undefined

    try {
      const tenantDatabase = getTenantDatabase(tenant)
      const companyRows = await tenantDatabase.selectFrom('companies').select(['id', 'name', 'status', 'settings', 'features', 'deleted_at']).execute()
      ready = true
      companies.push(...companyRows.filter((company) => isEmptyDeletedAt(company.deleted_at)).map((company) => ({
        id: company.id,
        name: company.name,
        status: company.status,
        settings: parseJsonObject(company.settings),
        features: parseJsonArray(company.features),
      })))
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Tenant database is not ready.'
    }

    return {
      ok: true,
      context: {
        tenant: { id: tenant.id, code: tenant.code, slug: tenant.slug, name: tenant.name, status: tenant.status },
        database: { type: 'mariadb', host: tenant.db_host, port: tenant.db_port, name: tenant.db_name, ready, error: databaseError },
        settings: parseJsonObject(tenant.payload_settings),
        policies,
        companies,
      },
    }
  }

  events() {
    return this.eventLog.recent()
  }

  private async findDuplicate(payload: { code: number; slug: string; corporate_id: string; mobile: string | null }, exceptId?: number) {
    if (await this.tenants.hasCode(payload.code, exceptId)) return { ok: false, error: 'Tenant code is already used.' }
    if (await this.tenants.hasSlug(payload.slug, exceptId)) return { ok: false, error: 'Tenant slug is already used.' }
    if (await this.tenants.hasCorporateId(payload.corporate_id, exceptId)) return { ok: false, error: 'Corporate ID is already used.' }
    if (await this.tenants.hasMobile(payload.mobile, exceptId)) return { ok: false, error: 'Mobile number is already used.' }
    return null
  }

  private async publishTenantEvent(type: string, tenantId: number, tenantCode: number) {
    const event = createPlatformEvent({
      type,
      payload: { tenantId, tenantCode },
      sync: platformSyncTags.onlineOnly,
    })
    this.eventLog.record(event)
    await this.eventBus.publish(event)
  }
}

async function ensureTenantPolicies(tenantId: number) {
  for (const policy of [
    { code: 'company.manage', name: 'Manage companies', description: 'Create, update, suspend, and restore companies in a tenant database.' },
    { code: 'rbac.manage', name: 'Manage RBAC', description: 'Manage tenant roles and policy assignments.' },
    { code: 'mail.manage', name: 'Manage mail', description: 'Configure tenant mail settings and send tenant mail.' },
  ]) {
    await ensurePolicy(policy)
    await ensureTenantPolicy(tenantId, policy.code)
  }
}

async function ensurePolicy(policy: { code: string; name: string; description: string }) {
  const existing = await getDatabase().selectFrom('rbac_policies').select('id').where('code', '=', policy.code).executeTakeFirst()
  if (existing) return
  await getDatabase().insertInto('rbac_policies').values(policy).execute()
}

async function ensureTenantPolicy(tenantId: number, policyCode: string) {
  const existing = await getDatabase()
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    await getDatabase().updateTable('tenant_rbac_policies').set({ enabled: 1, updated_at: nowIso() }).where('id', '=', existing.id).execute()
    return
  }

  await getDatabase().insertInto('tenant_rbac_policies').values({ tenant_id: tenantId, policy_code: policyCode, enabled: 1 }).execute()
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function isEmptyDeletedAt(value: Date | string | null | undefined): boolean {
  if (!value) return true
  if (value instanceof Date) return Number.isNaN(value.getTime())
  return false
}
