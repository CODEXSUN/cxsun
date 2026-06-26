import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import type { BlogCommentInput, InquiryInput, ListQuery } from '../domain/tirupur-connect.types.js'
import { json, pagination, parseJson, text, TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'
import { sql } from 'kysely'

@Injectable()
export class TirupurConnectPublicService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  status() {
    return {
      ok: true,
      product: 'Tirupur Connect',
      boundary: 'central-marketplace',
      tenantRequired: false,
      apiVersion: 'v1',
    }
  }

  async categories() {
    return this.repository.database()
      .selectFrom('tc_categories')
      .select(['uuid', 'name', 'slug', 'description', 'icon', 'parent_id', 'sort_order'])
      .where('status', '=', 'active')
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
      .execute()
  }

  async companies(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_companies')
      .select([
        'uuid', 'name', 'slug', 'description', 'business_type', 'city', 'state', 'country',
        'logo_url', 'cover_url', 'verification_level', 'trust_score', 'membership_tier',
        'monthly_capacity', 'minimum_order_quantity', 'lead_time', 'published_at',
      ])
      .where('publication_status', '=', 'published')
      .where('deleted_at', 'is', null)

    if (text(query.search)) {
      const search = `%${text(query.search)}%`
      statement = statement.where((eb) => eb.or([
        eb('name', 'like', search),
        eb('description', 'like', search),
        eb('business_type', 'like', search),
      ]))
    }
    if (text(query.city)) statement = statement.where('city', '=', text(query.city))
    if (text(query.category)) {
      const category = await this.repository.database().selectFrom('tc_categories').select('id').where('slug', '=', text(query.category)).executeTakeFirst()
      if (!category) return { records: [], page, limit }
      statement = statement
        .innerJoin('tc_company_categories', 'tc_company_categories.company_id', 'tc_companies.id')
        .where('tc_company_categories.category_id', '=', category.id)
    }

    const records = await statement
      .orderBy('featured_until', 'desc')
      .orderBy('trust_score', 'desc')
      .orderBy('published_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
    return { records, page, limit }
  }

  async company(slugOrUuid: string) {
    const database = this.repository.database()
    const company = await database
      .selectFrom('tc_companies')
      .selectAll()
      .where((eb) => eb.or([eb('slug', '=', slugOrUuid), eb('uuid', '=', slugOrUuid)]))
      .where('publication_status', '=', 'published')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!company) throw new NotFoundException('Published company was not found.')

    const [categories, products] = await Promise.all([
      database
        .selectFrom('tc_company_categories')
        .innerJoin('tc_categories', 'tc_categories.id', 'tc_company_categories.category_id')
        .select(['tc_categories.uuid', 'tc_categories.name', 'tc_categories.slug'])
        .where('tc_company_categories.company_id', '=', company.id)
        .execute(),
      database
        .selectFrom('tc_products')
        .select(['uuid', 'name', 'slug', 'description', 'price_from', 'currency', 'moq', 'lead_time', 'media'])
        .where('company_id', '=', company.id)
        .where('publication_status', '=', 'published')
        .where('deleted_at', 'is', null)
        .execute(),
    ])

    return { ...company, categories, products }
  }

  async products(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_products')
      .innerJoin('tc_companies', 'tc_companies.id', 'tc_products.company_id')
      .leftJoin('tc_categories', 'tc_categories.id', 'tc_products.category_id')
      .select([
        'tc_products.uuid', 'tc_products.name', 'tc_products.slug', 'tc_products.description',
        'tc_products.price_from', 'tc_products.currency', 'tc_products.moq', 'tc_products.lead_time',
        'tc_products.media', 'tc_companies.uuid as company_uuid', 'tc_companies.name as company_name',
        'tc_companies.slug as company_slug', 'tc_categories.name as category_name',
      ])
      .where('tc_products.publication_status', '=', 'published')
      .where('tc_companies.publication_status', '=', 'published')
      .where('tc_products.deleted_at', 'is', null)
    if (text(query.search)) {
      const search = `%${text(query.search)}%`
      statement = statement.where((eb) => eb.or([
        eb('tc_products.name', 'like', search),
        eb('tc_products.description', 'like', search),
        eb('tc_companies.name', 'like', search),
      ]))
    }
    if (text(query.category)) statement = statement.where('tc_categories.slug', '=', text(query.category))
    return {
      records: await statement.orderBy('tc_products.published_at', 'desc').limit(limit).offset(offset).execute(),
      page,
      limit,
    }
  }

  async rfqs(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_rfqs')
      .leftJoin('tc_categories', 'tc_categories.id', 'tc_rfqs.category_id')
      .select([
        'tc_rfqs.uuid', 'tc_rfqs.title', 'tc_rfqs.description', 'tc_rfqs.quantity', 'tc_rfqs.unit',
        'tc_rfqs.target_price', 'tc_rfqs.currency', 'tc_rfqs.delivery_date', 'tc_rfqs.delivery_location',
        'tc_rfqs.status', 'tc_rfqs.created_at', 'tc_categories.name as category_name',
      ])
      .where('tc_rfqs.status', 'in', ['open', 'matched', 'quoted', 'negotiation'])
      .where('tc_rfqs.privacy', '=', 'public')
      .where('tc_rfqs.deleted_at', 'is', null)
    if (text(query.search)) statement = statement.where('tc_rfqs.title', 'like', `%${text(query.search)}%`)
    if (text(query.category)) statement = statement.where('tc_categories.slug', '=', text(query.category))
    return { records: await statement.orderBy('tc_rfqs.created_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async content(type: 'event' | 'job' | 'article' | 'advertisement', query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_content')
      .selectAll()
      .where('content_type', '=', type)
      .where('status', '=', 'published')
      .where('deleted_at', 'is', null)
    if (text(query.search)) statement = statement.where('title', 'like', `%${text(query.search)}%`)
    if (type !== 'article') return { records: await statement.orderBy('published_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
    const category = text(query.category)
    if (category) {
      statement = statement.where(sql<boolean>`EXISTS (
        SELECT 1
        FROM tc_blog_article_categories ac
        INNER JOIN tc_blog_categories c ON c.id = ac.category_id
        WHERE ac.content_id = tc_content.id AND c.slug = ${category}
      )`)
    }
    const isHomeSurface = text(query.surface) === 'home'
    const records = await statement.orderBy('published_at', 'desc').limit(isHomeSurface ? 100 : limit).offset(offset).execute()
    const decorated = await Promise.all(records.map((record) => this.decorateArticle(record, false)))
    return { records: isHomeSurface ? orderHomeArticles(decorated).slice(0, limit) : decorated, page, limit }
  }

  async contentItem(type: 'event' | 'job' | 'article' | 'advertisement', slugOrUuid: string) {
    const record = await this.repository.database()
      .selectFrom('tc_content')
      .selectAll()
      .where('content_type', '=', type)
      .where((eb) => eb.or([eb('slug', '=', slugOrUuid), eb('uuid', '=', slugOrUuid)]))
      .where('status', '=', 'published')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!record) throw new NotFoundException('Published content was not found.')
    if (type !== 'article') return record
    await sql`UPDATE tc_content SET view_count = view_count + 1 WHERE id=${record.id}`.execute(this.repository.database())
    return this.decorateArticle(record, true)
  }

  async blogTaxonomy(kind: 'categories' | 'tags') {
    const result = kind === 'categories'
      ? await sql`SELECT uuid,name,slug,description,color,sort_order FROM tc_blog_categories WHERE status='active' ORDER BY sort_order ASC, name ASC`.execute(this.repository.database())
      : await sql`SELECT uuid,name,slug,description FROM tc_blog_tags WHERE status='active' ORDER BY name ASC`.execute(this.repository.database())
    return { records: result.rows }
  }

  async createBlogComment(input: BlogCommentInput) {
    const articleUuid = text(input.articleUuid)
    const body = text(input.body)
    const authorName = text(input.authorName)
    if (!articleUuid || !body || !authorName) throw new BadRequestException('Article, name, and comment are required.')
    const article = await this.repository.database().selectFrom('tc_content').selectAll().where('uuid', '=', articleUuid).where('content_type', '=', 'article').executeTakeFirst()
    if (!article || article.status !== 'published') throw new NotFoundException('Published article was not found.')
    if (Number((article as Record<string, unknown>).allow_comments ?? 1) !== 1) throw new BadRequestException('Comments are closed for this article.')
    let parentId: number | null = null
    const parentUuid = text(input.parentUuid)
    if (parentUuid) {
      const parent = await sql`SELECT id FROM tc_blog_comments WHERE uuid=${parentUuid} AND content_id=${article.id} LIMIT 1`.execute(this.repository.database())
      parentId = Number((parent.rows[0] as { id?: number } | undefined)?.id ?? 0) || null
    }
    await sql`
      INSERT INTO tc_blog_comments (uuid,content_id,parent_id,author_name,author_email,author_website,body,status)
      VALUES (${generatePublicUuid()},${article.id},${parentId},${authorName},${text(input.authorEmail).toLowerCase() || null},${text(input.authorWebsite) || null},${body},'pending')
    `.execute(this.repository.database())
    await this.repository.audit({ actorType: 'public', action: 'blog.comment.created', entityType: 'blog_comment', entityId: article.id, newValues: { articleUuid, parentUuid } })
    return { ok: true, status: 'pending' }
  }

  plans() {
    return this.repository.database()
      .selectFrom('tc_membership_plans')
      .select(['uuid', 'plan_key', 'name', 'description', 'price_paise', 'currency', 'billing_cycle', 'lead_limit', 'product_limit', 'features'])
      .where('status', '=', 'active')
      .orderBy('sort_order', 'asc')
      .execute()
  }

  async createInquiry(input: InquiryInput) {
    const name = text(input.name)
    const message = text(input.message)
    if (!name || !message) throw new BadRequestException('Name and message are required.')
    const database = this.repository.database()
    const [company, product, rfq] = await Promise.all([
      input.companyUuid ? database.selectFrom('tc_companies').select('id').where('uuid', '=', input.companyUuid).executeTakeFirst() : undefined,
      input.productUuid ? database.selectFrom('tc_products').select('id').where('uuid', '=', input.productUuid).executeTakeFirst() : undefined,
      input.rfqUuid ? database.selectFrom('tc_rfqs').select('id').where('uuid', '=', input.rfqUuid).executeTakeFirst() : undefined,
    ])
    const uuid = generatePublicUuid()
    await database.insertInto('tc_inquiries').values({
      uuid,
      company_id: company?.id ?? null,
      product_id: product?.id ?? null,
      rfq_id: rfq?.id ?? null,
      account_id: null,
      name,
      company_name: text(input.companyName) || null,
      email: text(input.email).toLowerCase() || null,
      phone: text(input.phone) || null,
      message,
      status: 'new',
    }).execute()
    await this.repository.audit({
      actorType: 'public',
      action: 'inquiry.created',
      entityType: 'inquiry',
      newValues: { uuid, companyId: company?.id, productId: product?.id, rfqId: rfq?.id },
      metadata: json({ email: input.email }),
    })
    return { ok: true, uuid }
  }

  private async decorateArticle<T extends Record<string, unknown>>(record: T, includeDetail: boolean) {
    const [tags, categories] = await Promise.all([sql`
      SELECT t.uuid, t.name, t.slug
      FROM tc_blog_tags t
      INNER JOIN tc_blog_article_tags at ON at.tag_id = t.id
      WHERE at.content_id = ${Number(record.id)}
      ORDER BY t.name ASC
    `.execute(this.repository.database()), sql`
      SELECT c.uuid, c.name, c.slug, c.color
      FROM tc_blog_categories c
      INNER JOIN tc_blog_article_categories ac ON ac.category_id = c.id
      WHERE ac.content_id = ${Number(record.id)}
      ORDER BY c.sort_order ASC, c.name ASC
    `.execute(this.repository.database())])
    const comments = includeDetail ? await sql`
      SELECT c.id,c.uuid,c.parent_id,c.author_name,c.body,c.created_at,p.uuid AS parent_uuid
      FROM tc_blog_comments c
      LEFT JOIN tc_blog_comments p ON p.id = c.parent_id
      WHERE c.content_id=${Number(record.id)}
        AND c.status='approved'
        AND (c.parent_id IS NULL OR p.status='approved')
      ORDER BY c.created_at ASC
    `.execute(this.repository.database()) : { rows: [] }
    const related = includeDetail ? await this.relatedArticles(record) : []
    return { ...record, tags: tags.rows, categories: categories.rows, comments: nestComments(comments.rows as Array<Record<string, unknown>>), related }
  }

  private async relatedArticles(record: Record<string, unknown>) {
    const metadata = parseJson<Record<string, unknown>>(record.metadata as string | null | undefined, {})
    const manualSlugs = Array.isArray(metadata.relatedSlugs) ? metadata.relatedSlugs.map((item) => text(item)).filter(Boolean).slice(0, 6) : []
    const database = this.repository.database()
    if (manualSlugs.length) {
      const rows = await database
        .selectFrom('tc_content')
        .select(['uuid', 'title', 'slug', 'summary', 'image_url', 'category', 'published_at', 'updated_at'])
        .where('content_type', '=', 'article')
        .where('status', '=', 'published')
        .where('deleted_at', 'is', null)
        .where('id', '<>', Number(record.id))
        .where('slug', 'in', manualSlugs)
        .execute()
      const ordered = manualSlugs.flatMap((slug) => rows.filter((row) => row.slug === slug))
      if (ordered.length) return ordered
    }
    const related = await sql`
      SELECT uuid,title,slug,summary,excerpt,image_url,category,published_at,updated_at
      FROM tc_content
      WHERE content_type='article' AND status='published' AND deleted_at IS NULL AND id<>${Number(record.id)}
        AND (${record.category ?? ''} = '' OR category=${String(record.category ?? '')})
      ORDER BY published_at DESC
      LIMIT 3
    `.execute(this.repository.database())
    return related.rows
  }
}

function nestComments(rows: Array<Record<string, unknown>>) {
  const byId = new Map<number, Record<string, unknown> & { replies: Array<Record<string, unknown>> }>()
  const roots: Array<Record<string, unknown> & { replies: Array<Record<string, unknown>> }> = []
  rows.forEach((row) => byId.set(Number(row.id), { ...row, replies: [] }))
  rows.forEach((row) => {
    const item = byId.get(Number(row.id))
    if (!item) return
    const parentId = Number(row.parent_id ?? 0)
    const parent = parentId ? byId.get(parentId) : null
    if (parent) parent.replies.push(item)
    else roots.push(item)
  })
  return roots
}

function orderHomeArticles<T extends Record<string, unknown>>(records: T[]) {
  const visible = records.filter((record) => {
    const metadata = parseJson<Record<string, unknown>>(record.metadata as string | null | undefined, {})
    return metadata.publicShow !== false
  })
  return visible.sort((left, right) => {
    const leftMeta = parseJson<Record<string, unknown>>(left.metadata as string | null | undefined, {})
    const rightMeta = parseJson<Record<string, unknown>>(right.metadata as string | null | undefined, {})
    const leftRoom = roomValue(leftMeta.publicRoom, left.uuid)
    const rightRoom = roomValue(rightMeta.publicRoom, right.uuid)
    const roomDiff = leftRoom - rightRoom
    if (roomDiff) return roomDiff
    const orderDiff = Number(leftMeta.publicOrder ?? 999) - Number(rightMeta.publicOrder ?? 999)
    if (orderDiff) return orderDiff
    return String(right.published_at ?? right.updated_at ?? '').localeCompare(String(left.published_at ?? left.updated_at ?? ''))
  })
}

function roomValue(value: unknown, seed: unknown) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3) return parsed
  const chars = String(seed ?? 'article')
  const hash = chars.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return (hash % 3) + 1
}
