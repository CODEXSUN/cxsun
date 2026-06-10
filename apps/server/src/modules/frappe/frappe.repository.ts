import { type Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { FrappeRecordLink, FrappeSettings, FrappeSettingsInput, FrappeSyncJob, FrappeSyncJobInput, FrappeWorkspace } from './frappe.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class FrappeRepository {
  async workspace(context: TenantRuntimeContext): Promise<FrappeWorkspace> {
    return {
      settings: await this.settings(context),
      jobs: await this.jobs(context),
      links: await this.links(context),
    }
  }

  async settings(context: TenantRuntimeContext): Promise<FrappeSettings> {
    const companyId = await this.defaultCompanyId(context)
    const row = await this.database(context)
      .selectFrom('frappe_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where((eb) => companyId ? eb('company_id', '=', companyId) : eb('company_id', 'is', null))
      .executeTakeFirst()

    if (row) return toSettings(row)

    await this.database(context).insertInto('frappe_settings').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      company_id: companyId,
      enabled: false,
      base_url: 'http://localhost:8000',
      timeout_seconds: 30,
      settings: JSON.stringify({ mode: 'handshake-first' }),
      updated_by: context.user.email,
      updated_at: new Date(),
    }).execute()

    return this.settings(context)
  }

  async saveSettings(context: TenantRuntimeContext, input: FrappeSettingsInput): Promise<FrappeSettings> {
    const current = await this.settings(context)
    const patch = {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      base_url: input.base_url === undefined ? current.base_url : normalizeBaseUrl(input.base_url) || current.base_url,
      site_name: input.site_name === undefined ? current.site_name : emptyAsNull(input.site_name),
      api_key: input.api_key === undefined ? current.api_key : emptyAsNull(input.api_key),
      api_secret: input.api_secret === undefined ? current.api_secret : emptyAsNull(input.api_secret),
      default_company: input.default_company === undefined ? current.default_company : emptyAsNull(input.default_company),
      default_warehouse: input.default_warehouse === undefined ? current.default_warehouse : emptyAsNull(input.default_warehouse),
      timeout_seconds: input.timeout_seconds === undefined ? current.timeout_seconds : boundedTimeout(input.timeout_seconds),
      sync_contacts: input.sync_contacts === undefined ? current.sync_contacts : Boolean(input.sync_contacts),
      sync_products: input.sync_products === undefined ? current.sync_products : Boolean(input.sync_products),
      sync_sales: input.sync_sales === undefined ? current.sync_sales : Boolean(input.sync_sales),
      sync_purchase: input.sync_purchase === undefined ? current.sync_purchase : Boolean(input.sync_purchase),
      settings: mergeSettingsJson(current.settings, input.settings) ?? current.settings,
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    await this.database(context).updateTable('frappe_settings').set(patch).where('id', '=', current.id).execute()
    return this.settings(context)
  }

  async jobs(context: TenantRuntimeContext): Promise<FrappeSyncJob[]> {
    const rows = await this.database(context)
      .selectFrom('frappe_sync_jobs')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('id', 'desc')
      .limit(50)
      .execute()
    return rows.map(toJob)
  }

  async createJob(context: TenantRuntimeContext, input: FrappeSyncJobInput): Promise<FrappeWorkspace> {
    const settings = await this.settings(context)
    if (!settings.enabled) throw new BadRequestException('Verify Frappe connection before creating a sync job.')

    await this.database(context).insertInto('frappe_sync_jobs').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      company_id: settings.company_id,
      job_type: input.job_type?.trim() || 'single-operation',
      direction: input.direction?.trim() || 'export',
      status: 'queued',
      requested_by: context.user.email,
      total_records: 0,
      success_count: 0,
      failed_count: 0,
      payload: jsonOrNull(input.payload) ?? JSON.stringify({ requested_at: new Date().toISOString() }),
      updated_at: new Date(),
    }).execute()

    return this.workspace(context)
  }

  async links(context: TenantRuntimeContext): Promise<FrappeRecordLink[]> {
    const rows = await this.database(context)
      .selectFrom('frappe_record_links')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('updated_at', 'desc')
      .limit(50)
      .execute()
    return rows.map(toLink)
  }

  async saveRemoteLink(
    context: TenantRuntimeContext,
    input: {
      doctype: string
      direction: string
      remote_name?: string | null
      record_label?: string | null
      status: string
      last_error?: string | null
      payload?: unknown
    },
  ) {
    const settings = await this.settings(context)
    await this.database(context).insertInto('frappe_record_links').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      company_id: settings.company_id,
      doctype: input.doctype,
      direction: input.direction,
      remote_name: emptyAsNull(input.remote_name),
      record_label: emptyAsNull(input.record_label),
      status: input.status,
      last_synced_at: input.status === 'synced' ? new Date() : null,
      last_error: emptyAsNull(input.last_error),
      payload: jsonOrNull(input.payload),
      updated_by: context.user.email,
      updated_at: new Date(),
    }).execute()
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0) || null
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSettings(row: Record<string, unknown>): FrappeSettings {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    enabled: Boolean(row.enabled),
    base_url: String(row.base_url),
    site_name: stringOrNull(row.site_name),
    api_key: stringOrNull(row.api_key),
    api_secret: stringOrNull(row.api_secret),
    default_company: stringOrNull(row.default_company),
    default_warehouse: stringOrNull(row.default_warehouse),
    timeout_seconds: numberValue(row.timeout_seconds) || 30,
    sync_contacts: Boolean(row.sync_contacts),
    sync_products: Boolean(row.sync_products),
    sync_sales: Boolean(row.sync_sales),
    sync_purchase: Boolean(row.sync_purchase),
    settings: stringOrNull(row.settings),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toJob(row: Record<string, unknown>): FrappeSyncJob {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    job_type: String(row.job_type),
    direction: String(row.direction),
    status: String(row.status),
    requested_by: String(row.requested_by),
    started_at: row.started_at as Date | null,
    finished_at: row.finished_at as Date | null,
    total_records: numberValue(row.total_records),
    success_count: numberValue(row.success_count),
    failed_count: numberValue(row.failed_count),
    error_message: stringOrNull(row.error_message),
    payload: stringOrNull(row.payload),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toLink(row: Record<string, unknown>): FrappeRecordLink {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    doctype: String(row.doctype),
    local_module: stringOrNull(row.local_module),
    local_record_uuid: stringOrNull(row.local_record_uuid),
    remote_name: stringOrNull(row.remote_name),
    record_label: stringOrNull(row.record_label),
    direction: String(row.direction),
    status: String(row.status),
    last_synced_at: row.last_synced_at as Date | null,
    last_error: stringOrNull(row.last_error),
    payload: stringOrNull(row.payload),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function normalizeBaseUrl(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : ''
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) && number > 0 ? number : null
}

function boundedTimeout(value: unknown) {
  const number = numberValue(value)
  return Math.min(Math.max(number || 30, 1), 120)
}

function jsonOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return JSON.stringify(value)
  try {
    JSON.parse(value)
    return value
  } catch {
    return JSON.stringify(value)
  }
}

function mergeSettingsJson(currentValue: unknown, inputValue: unknown) {
  if (inputValue === undefined) return jsonOrNull(currentValue)
  if (inputValue === null || inputValue === '') return jsonOrNull(currentValue)
  if (typeof inputValue === 'string') return inputValue
  if (!inputValue || typeof inputValue !== 'object' || Array.isArray(inputValue)) return jsonOrNull(currentValue)
  return JSON.stringify({
    ...jsonObjectOrEmpty(currentValue),
    ...(inputValue as Record<string, unknown>),
  })
}

function jsonObjectOrEmpty(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}
