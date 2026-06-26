import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantDomainResolution } from './tenant-domain.types.js'
import { TenantDomainRepository } from './tenant-domain.repository.js'

export interface ResolvedTenantDomain {
  ok: true
  domain: NonNullable<TenantDomainResolution['domain']> & {
    settings: Record<string, unknown>
  }
  tenant: NonNullable<TenantDomainResolution['tenant']> & {
    apps: {
      enabled: string[]
      landing: string
    }
  }
}

export type DomainResolutionResult = ResolvedTenantDomain | {
  ok: false
  error: string
}

@Injectable()
export class DomainResolutionEngine {
  constructor(
    @Inject(TenantDomainRepository) private readonly domains: TenantDomainRepository,
  ) {}

  async resolve(hostOrDomain: string): Promise<DomainResolutionResult> {
    const record = await this.domains.resolve(hostOrDomain)

    if (!record) return { ok: false, error: 'Tenant domain was not found.' }
    if (record.domain_status !== 'active' || record.tenant_status !== 'active') {
      return { ok: false, error: 'Tenant domain is not active.' }
    }

    const tenantSettings = parseJsonObject(record.payload_settings)
    const domainSettings = parseJsonObject(record.domain_settings)
    const enabledApps = readEnabledApps(tenantSettings)
    const landingApp = readLandingApp(tenantSettings, enabledApps)
    const industry = readIndustry(tenantSettings)
    const liveScope = readLiveScope(tenantSettings)

    return {
      ok: true,
      domain: {
        id: Number(record.domain_id),
        domain: String(record.domain),
        label: String(record.label),
        isPrimary: Number(record.is_primary) === 1,
        status: record.domain_status as never,
        settings: domainSettings,
      },
      tenant: {
        id: Number(record.tenant_id),
        code: String(record.tenant_code),
        corporate_id: String(record.corporate_id),
        mobile: String(record.mobile),
        slug: String(record.tenant_slug),
        name: String(record.tenant_name),
        status: record.tenant_status as never,
        db_type: 'mariadb',
        db_host: String(record.db_host),
        db_port: Number(record.db_port),
        db_name: String(record.db_name),
        db_user: String(record.db_user),
        db_secret_ref: record.db_secret_ref ? String(record.db_secret_ref) : null,
        company_count: Number(record.company_count),
        active_company_count: Number(record.active_company_count),
        company_concept_count: Number(record.company_concept_count),
        payload_settings: String(record.payload_settings),
        created_at: String(record.tenant_created_at),
        updated_at: String(record.tenant_updated_at),
        deleted_at: record.tenant_deleted_at ? String(record.tenant_deleted_at) : null,
        database: String(record.db_name),
        settings: tenantSettings,
        industryKey: industry.key,
        industryName: industry.name,
        liveScope,
        features: readFeatures(tenantSettings),
        apps: { enabled: enabledApps, landing: landingApp },
      },
    }
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function readFeatures(settings: Record<string, unknown>) {
  return Array.isArray(settings.features) ? settings.features.map(String) : []
}

function readIndustry(settings: Record<string, unknown>) {
  const industry = settings.industry
  if (!industry || typeof industry !== 'object' || Array.isArray(industry)) return { key: null, name: null }
  const record = industry as { code?: unknown, name?: unknown }
  return {
    key: typeof record.code === 'string' ? record.code : null,
    name: typeof record.name === 'string' ? record.name : null,
  }
}

function readLiveScope(settings: Record<string, unknown>) {
  const liveScope = settings.liveScope
  if (!liveScope || typeof liveScope !== 'object' || Array.isArray(liveScope)) {
    return { companies: [], requirements: [], notes: '', domains: [] }
  }

  const record = liveScope as { companies?: unknown; requirements?: unknown; notes?: unknown; domains?: unknown }
  return {
    companies: Array.isArray(record.companies) ? record.companies.map(String) : [],
    requirements: Array.isArray(record.requirements) ? record.requirements.map(String) : [],
    notes: typeof record.notes === 'string' ? record.notes : '',
    domains: Array.isArray(record.domains) ? record.domains.map(String) : [],
  }
}

function readEnabledApps(settings: Record<string, unknown>) {
  const apps = settings.apps
  if (!apps || typeof apps !== 'object' || Array.isArray(apps)) return []
  const enabled = (apps as { enabled?: unknown }).enabled
  return Array.isArray(enabled) ? enabled.map(String) : []
}

function readLandingApp(settings: Record<string, unknown>, enabledApps: string[]) {
  const apps = settings.apps
  if (apps && typeof apps === 'object' && !Array.isArray(apps)) {
    const landing = (apps as { landing?: unknown }).landing
    if (typeof landing === 'string' && enabledApps.includes(landing)) return landing
  }
  return enabledApps[0] ?? ''
}
