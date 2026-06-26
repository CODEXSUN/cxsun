import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import type { FrontendSectionInput, FrontendSectionItemInput } from '../domain/tirupur-connect.types.js'
import { json, numberValue, parseJson, text, TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'

type MarketplaceAdminIdentity = { id: number; type: string; role: string }
const editorRoles = ['super-admin', 'software-admin', 'marketplace-admin', 'content-editor']

@Injectable()
export class TirupurConnectFrontendDesignerService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  pages() {
    return this.repository.database().selectFrom('tc_frontend_pages').selectAll().orderBy('title', 'asc').execute()
  }

  async publicPage(pageKey: string) {
    return this.page(pageKey, true)
  }

  async adminPage(pageKey: string) {
    return this.page(pageKey, false)
  }

  async upsertSection(admin: MarketplaceAdminIdentity, input: FrontendSectionInput) {
    assertEditor(admin)
    const database = this.repository.database()
    const existing = input.uuid
      ? await database.selectFrom('tc_frontend_sections').selectAll().where('uuid', '=', input.uuid).executeTakeFirst()
      : undefined
    const page = existing
      ? await database.selectFrom('tc_frontend_pages').selectAll().where('id', '=', existing.page_id).executeTakeFirst()
      : await database.selectFrom('tc_frontend_pages').selectAll().where('page_key', '=', text(input.pageKey, 'home')).executeTakeFirst()
    if (!page) throw new NotFoundException('Frontend page was not found.')
    const sectionKey = text(input.sectionKey, existing?.section_key ?? '')
    const sectionType = text(input.sectionType, existing?.section_type ?? '')
    if (!sectionKey || !sectionType) throw new BadRequestException('Section key and type are required.')
    const values = {
      page_id: page.id,
      section_key: sectionKey,
      section_type: sectionType,
      title: nullable(input.title, existing?.title),
      eyebrow: nullable(input.eyebrow, existing?.eyebrow),
      body: nullable(input.body, existing?.body),
      settings: input.settings === undefined ? existing?.settings ?? null : json(input.settings),
      sort_order: Math.round(numberValue(input.sortOrder, existing?.sort_order ?? 0)),
      status: text(input.status, existing?.status ?? 'active'),
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) await database.updateTable('tc_frontend_sections').set(values).where('id', '=', existing.id).execute()
    else id = Number((await database.insertInto('tc_frontend_sections').values({ ...values, uuid: generatePublicUuid() }).executeTakeFirst()).insertId)
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: existing ? 'frontend_section.updated' : 'frontend_section.created',
      entityType: 'frontend_section',
      entityId: id,
      oldValues: existing,
      newValues: values,
    })
    return database.selectFrom('tc_frontend_sections').selectAll().where('id', '=', id!).executeTakeFirst()
  }

  async upsertItem(admin: MarketplaceAdminIdentity, input: FrontendSectionItemInput) {
    assertEditor(admin)
    const database = this.repository.database()
    const existing = input.uuid
      ? await database.selectFrom('tc_frontend_section_items').selectAll().where('uuid', '=', input.uuid).executeTakeFirst()
      : undefined
    const section = existing
      ? await database.selectFrom('tc_frontend_sections').selectAll().where('id', '=', existing.section_id).executeTakeFirst()
      : await database.selectFrom('tc_frontend_sections').selectAll().where('uuid', '=', text(input.sectionUuid)).executeTakeFirst()
    if (!section) throw new NotFoundException('Frontend section was not found.')
    const title = text(input.title, existing?.title ?? '')
    if (!title) throw new BadRequestException('Item title is required.')
    const values = {
      section_id: section.id,
      item_key: text(input.itemKey, existing?.item_key ?? `item-${Date.now()}`),
      eyebrow: nullable(input.eyebrow, existing?.eyebrow),
      title,
      summary: nullable(input.summary, existing?.summary),
      body: nullable(input.body, existing?.body),
      image_url: nullable(input.imageUrl, existing?.image_url),
      target_url: nullable(input.targetUrl, existing?.target_url),
      content: input.content === undefined ? existing?.content ?? null : json(input.content),
      sort_order: Math.round(numberValue(input.sortOrder, existing?.sort_order ?? 0)),
      status: text(input.status, existing?.status ?? 'active'),
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) await database.updateTable('tc_frontend_section_items').set(values).where('id', '=', existing.id).execute()
    else id = Number((await database.insertInto('tc_frontend_section_items').values({ ...values, uuid: generatePublicUuid() }).executeTakeFirst()).insertId)
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: existing ? 'frontend_item.updated' : 'frontend_item.created',
      entityType: 'frontend_section_item',
      entityId: id,
      oldValues: existing,
      newValues: values,
    })
    return database.selectFrom('tc_frontend_section_items').selectAll().where('id', '=', id!).executeTakeFirst()
  }

  private async page(pageKey: string, publicOnly: boolean) {
    const database = this.repository.database()
    let pageQuery = database.selectFrom('tc_frontend_pages').selectAll().where('page_key', '=', pageKey)
    if (publicOnly) pageQuery = pageQuery.where('status', '=', 'active')
    const page = await pageQuery.executeTakeFirst()
    if (!page) throw new NotFoundException('Frontend page was not found.')
    let sectionQuery = database.selectFrom('tc_frontend_sections').selectAll().where('page_id', '=', page.id)
    if (publicOnly) sectionQuery = sectionQuery.where('status', '=', 'active')
    const sections = await sectionQuery.orderBy('sort_order', 'asc').execute()
    const result = []
    for (const section of sections) {
      let itemQuery = database.selectFrom('tc_frontend_section_items').selectAll().where('section_id', '=', section.id)
      if (publicOnly) itemQuery = itemQuery.where('status', '=', 'active')
      const items = await itemQuery.orderBy('sort_order', 'asc').execute()
      result.push({
        ...section,
        settings: parseJson(section.settings, {}),
        items: items.map((item) => ({ ...item, content: parseJson(item.content, {}) })),
      })
    }
    return { ...page, metadata: parseJson(page.metadata, {}), sections: result }
  }
}

function assertEditor(admin: MarketplaceAdminIdentity) {
  if (!editorRoles.includes(admin.role)) throw new ForbiddenException('Frontend designer access is required.')
}

function nullable(value: unknown, fallback?: string | null) {
  if (value === undefined) return fallback ?? null
  return text(value) || null
}
