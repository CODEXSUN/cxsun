import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import type { Tenant } from '../../../../core/tenant/domain/tenant.types.js'
import { getTenantDatabase } from '../../../../infrastructure/tenant-database/tenant-database.connection.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import type { SiteSlider, SiteSliderInput, SiteSliderStatus } from '../site-slider.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class SiteSliderRepository {
  async list(context: TenantRuntimeContext) {
    const rows = await this.database(context)
      .selectFrom('site_sliders')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'desc')
      .execute()
    return rows.map(toSlider)
  }

  async listPublished(tenant: Tenant, placement = 'home-slider') {
    const rows = await (getTenantDatabase(tenant) as unknown as Kysely<DynamicDatabase>)
      .selectFrom('site_sliders')
      .selectAll()
      .where('tenant_id', '=', tenant.id)
      .where('placement', '=', placement)
      .where('status', '=', 'published')
      .where('deleted_at', 'is', null)
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc')
      .execute()
    return rows.map(toSlider)
  }

  async find(context: TenantRuntimeContext, idOrUuid: string | number) {
    const row = await this.database(context)
      .selectFrom('site_sliders')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(idColumn(String(idOrUuid)), '=', idValue(String(idOrUuid)))
      .executeTakeFirst()
    return row ? toSlider(row) : null
  }

  async upsert(context: TenantRuntimeContext, input: SiteSliderInput) {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Slider name is required.')
    const slug = slugValue(input.slug || name)
    const status = statusValue(input.status)
    const row = {
      tenant_id: context.tenant.id,
      name,
      slug,
      placement: input.placement?.trim() || 'home-slider',
      status,
      sort_order: numberValue(input.sort_order, 1),
      options_json: JSON.stringify(input.options ?? {}),
      slides_json: JSON.stringify(Array.isArray(input.slides) ? input.slides : []),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (input.uuid) {
      const existing = await this.find(context, input.uuid)
      if (!existing) throw new NotFoundException('Site slider was not found.')
      await this.database(context).updateTable('site_sliders').set(row).where('id', '=', existing.id).execute()
      await this.activity(context, existing.id, 'updated', `Slider updated: ${name}`, input)
      return this.find(context, existing.id)
    }

    const result = await this.database(context)
      .insertInto('site_sliders')
      .values({
        uuid: dispatchPublicUuid(),
        created_by: context.user.email,
        ...row,
      })
      .executeTakeFirst()
    const sliderId = Number(result.insertId)
    await this.activity(context, sliderId, 'created', `Slider created: ${name}`, input)
    return this.find(context, sliderId)
  }

  async destroy(context: TenantRuntimeContext, idOrUuid: string) {
    const slider = await this.find(context, idOrUuid)
    if (!slider) throw new NotFoundException('Site slider was not found.')
    await this.database(context)
      .updateTable('site_sliders')
      .set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email })
      .where('id', '=', slider.id)
      .execute()
    await this.activity(context, slider.id, 'deleted', `Slider deleted: ${slider.name}`, {})
    return slider
  }

  private async activity(context: TenantRuntimeContext, sliderId: number, activityType: string, message: string, payload: unknown) {
    await this.database(context)
      .insertInto('site_slider_activities')
      .values({
        uuid: dispatchPublicUuid(),
        slider_id: sliderId,
        activity_type: activityType,
        actor_email: context.user.email,
        message,
        payload: JSON.stringify(payload ?? {}),
      })
      .execute()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSlider(row: Record<string, unknown>): SiteSlider {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    slug: String(row.slug),
    placement: String(row.placement),
    status: statusValue(row.status),
    sort_order: numberValue(row.sort_order, 1),
    options: jsonValue(row.options_json, {}),
    slides: jsonValue(row.slides_json, []),
    created_by: String(row.created_by),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date | string,
    updated_at: row.updated_at as Date | string,
    deleted_at: row.deleted_at as Date | string | null,
  }
}

function statusValue(value: unknown): SiteSliderStatus {
  return value === 'published' || value === 'archived' ? value : 'draft'
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}

function slugValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'slider'
}

function jsonValue<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === 'string' ? JSON.parse(value) as T : value as T
  } catch {
    return fallback
  }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value ?? fallback)
  return Number.isFinite(number) ? number : fallback
}
