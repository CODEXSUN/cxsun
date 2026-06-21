import { Injectable } from '../../../core/decorators/injectable.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import { getTirupurConnectDatabase } from './database/tirupur-connect.connection.js'

@Injectable()
export class TirupurConnectRepository {
  database() {
    return getTirupurConnectDatabase()
  }

  findAccountByEmail(email: string) {
    return getTirupurConnectDatabase()
      .selectFrom('tc_accounts')
      .selectAll()
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findAccountById(id: number) {
    return getTirupurConnectDatabase()
      .selectFrom('tc_accounts')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findCompanyByAccount(accountId: number) {
    return getTirupurConnectDatabase()
      .selectFrom('tc_companies')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findCompanyByUuid(uuid: string) {
    return getTirupurConnectDatabase()
      .selectFrom('tc_companies')
      .selectAll()
      .where('uuid', '=', uuid)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findCompanyBySlug(slug: string) {
    return getTirupurConnectDatabase()
      .selectFrom('tc_companies')
      .selectAll()
      .where('slug', '=', slug)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findCategoryByUuid(uuid?: string) {
    if (!uuid) return Promise.resolve(undefined)
    return getTirupurConnectDatabase()
      .selectFrom('tc_categories')
      .selectAll()
      .where('uuid', '=', uuid)
      .where('status', '=', 'active')
      .executeTakeFirst()
  }

  async replaceCompanyCategories(companyId: number, categoryUuids: string[]) {
    const database = getTirupurConnectDatabase()
    const uniqueUuids = [...new Set(categoryUuids.filter(Boolean))]
    await database.deleteFrom('tc_company_categories').where('company_id', '=', companyId).execute()
    if (!uniqueUuids.length) return

    const categories = await database.selectFrom('tc_categories').select('id').where('uuid', 'in', uniqueUuids).execute()
    for (const category of categories) {
      await database.insertInto('tc_company_categories').values({ company_id: companyId, category_id: category.id }).execute()
    }
  }

  async audit(input: {
    actorType: string
    actorId?: number | null
    action: string
    entityType: string
    entityId?: number | null
    oldValues?: unknown
    newValues?: unknown
    metadata?: unknown
  }) {
    await getTirupurConnectDatabase().insertInto('tc_audit_logs').values({
      uuid: generatePublicUuid(),
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_values: json(input.oldValues),
      new_values: json(input.newValues),
      metadata: json(input.metadata),
    }).execute()
  }

  touchAccountLogin(accountId: number) {
    return getTirupurConnectDatabase()
      .updateTable('tc_accounts')
      .set({ last_login_at: nowIso(), updated_at: nowIso() })
      .where('id', '=', accountId)
      .execute()
  }
}

export function json(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value)
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function slugify(value: unknown, fallback = 'record') {
  const slug = String(value ?? '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || fallback
}

export function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function nullableText(value: unknown) {
  const normalized = text(value)
  return normalized || null
}

export function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function pagination(input: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Math.floor(numberValue(input.page, 1)))
  const limit = Math.min(100, Math.max(1, Math.floor(numberValue(input.limit, 24))))
  return { page, limit, offset: (page - 1) * limit }
}
