import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import type { BlogTaxonomyInput, ContentInput, ListQuery, ReviewDecisionInput } from '../domain/tirupur-connect.types.js'
import { sql } from 'kysely'
import {
  json, nullableNumber, nullableText, pagination, slugify, text, TirupurConnectRepository,
} from '../infrastructure/tirupur-connect.repository.js'

export interface MarketplaceAdminIdentity {
  id: number
  type: string
  role: string
}

@Injectable()
export class TirupurConnectAdminService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async dashboard() {
    const database = this.repository.database()
    const [companies, publishedRow, submissionsRow, rfqs, quotes, inquiriesRow, verificationsRow, membershipsRow] = await Promise.all([
      count(database, 'tc_companies'),
      database.selectFrom('tc_companies').select(({ fn }) => fn.count<number>('id').as('count')).where('publication_status', '=', 'published').executeTakeFirst(),
      database.selectFrom('tc_submissions').select(({ fn }) => fn.count<number>('id').as('count')).where('status', '=', 'submitted').executeTakeFirst(),
      count(database, 'tc_rfqs'),
      count(database, 'tc_rfq_quotes'),
      database.selectFrom('tc_inquiries').select(({ fn }) => fn.count<number>('id').as('count')).where('status', '=', 'new').executeTakeFirst(),
      database.selectFrom('tc_verification_requests').select(({ fn }) => fn.count<number>('id').as('count')).where('status', '=', 'submitted').executeTakeFirst(),
      database.selectFrom('tc_memberships').select(({ fn }) => fn.count<number>('id').as('count')).where('status', '=', 'active').executeTakeFirst(),
    ])
    return {
      companies,
      publishedCompanies: Number(publishedRow?.count ?? 0),
      pendingSubmissions: Number(submissionsRow?.count ?? 0),
      rfqs,
      quotes,
      newInquiries: Number(inquiriesRow?.count ?? 0),
      pendingVerifications: Number(verificationsRow?.count ?? 0),
      activeMemberships: Number(membershipsRow?.count ?? 0),
    }
  }

  async submissions(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_submissions').selectAll()
    if (text(query.status)) statement = statement.where('status', '=', text(query.status))
    if (text(query.sourceType)) statement = statement.where('entity_type', '=', text(query.sourceType))
    return { records: await statement.orderBy('submitted_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async submission(uuid: string) {
    const database = this.repository.database()
    const submission = await database.selectFrom('tc_submissions').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!submission) throw new NotFoundException('Submission was not found.')
    const revisions = await database.selectFrom('tc_submission_revisions').selectAll().where('submission_id', '=', submission.id).orderBy('revision_number', 'desc').execute()
    return { ...submission, revisions }
  }

  async reviewSubmission(admin: MarketplaceAdminIdentity, uuid: string, input: ReviewDecisionInput) {
    if (!['super-admin', 'software-admin', 'marketplace-admin', 'verifier'].includes(admin.role)) {
      throw new ForbiddenException('This administrator cannot review connector submissions.')
    }
    const status = text(input.status)
    if (!['under_review', 'changes_requested', 'approved', 'published', 'suspended', 'archived'].includes(status)) {
      throw new BadRequestException('Unsupported submission review status.')
    }
    const database = this.repository.database()
    const submission = await database.selectFrom('tc_submissions').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!submission) throw new NotFoundException('Submission was not found.')
    const revision = await database.selectFrom('tc_submission_revisions').selectAll().where('id', '=', submission.latest_revision_id ?? 0).executeTakeFirst()
    if (!revision) throw new NotFoundException('Submission revision was not found.')

    if (status === 'approved' || status === 'published') {
      await this.applyApprovedRevision(submission, revision, status === 'published')
    }
    await database.updateTable('tc_submissions').set({
      status,
      reviewed_by: admin.id,
      reviewed_at: nowIso(),
      review_notes: nullableText(input.notes),
      updated_at: nowIso(),
    }).where('id', '=', submission.id).execute()
    await database.updateTable('tc_submission_revisions').set({ status }).where('id', '=', revision.id).execute()
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'submission.reviewed',
      entityType: 'submission',
      entityId: submission.id,
      oldValues: { status: submission.status },
      newValues: { status, notes: input.notes, revision: revision.revision_number },
    })
    return this.submission(uuid)
  }

  async companies(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_companies').selectAll().where('deleted_at', 'is', null)
    if (text(query.status)) statement = statement.where('publication_status', '=', text(query.status))
    if (text(query.sourceType)) statement = statement.where('source_type', '=', text(query.sourceType))
    if (text(query.search)) statement = statement.where('name', 'like', `%${text(query.search)}%`)
    return { records: await statement.orderBy('updated_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async company(uuid: string) {
    const company = await this.repository.findCompanyByUuid(uuid)
    if (!company) throw new NotFoundException('Company was not found.')
    const database = this.repository.database()
    const [categories, products, verifications, account, submission] = await Promise.all([
      database.selectFrom('tc_company_categories')
        .innerJoin('tc_categories', 'tc_categories.id', 'tc_company_categories.category_id')
        .select(['tc_categories.uuid', 'tc_categories.name', 'tc_categories.slug'])
        .where('tc_company_categories.company_id', '=', company.id)
        .orderBy('tc_categories.name', 'asc')
        .execute(),
      database.selectFrom('tc_products')
        .selectAll()
        .where('company_id', '=', company.id)
        .where('deleted_at', 'is', null)
        .orderBy('updated_at', 'desc')
        .execute(),
      database.selectFrom('tc_verification_requests')
        .selectAll()
        .where('company_id', '=', company.id)
        .orderBy('created_at', 'desc')
        .execute(),
      company.account_id
        ? database.selectFrom('tc_accounts')
          .select(['uuid', 'name', 'email', 'phone', 'role', 'status', 'email_verified_at', 'last_login_at'])
          .where('id', '=', company.account_id)
          .executeTakeFirst()
        : Promise.resolve(undefined),
      company.source_type === 'billing_connector' && company.source_tenant_id && company.external_record_uuid
        ? database.selectFrom('tc_submissions')
          .selectAll()
          .where('source_tenant_id', '=', company.source_tenant_id)
          .where('entity_type', '=', 'company')
          .where('external_record_uuid', '=', company.external_record_uuid)
          .executeTakeFirst()
        : Promise.resolve(undefined),
    ])
    return { ...company, account: account ?? null, categories, products, submission: submission ?? null, verifications }
  }

  async rfqs(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_rfqs')
      .innerJoin('tc_accounts', 'tc_accounts.id', 'tc_rfqs.buyer_account_id')
      .select([
        'tc_rfqs.id', 'tc_rfqs.uuid', 'tc_rfqs.title', 'tc_rfqs.description', 'tc_rfqs.quantity',
        'tc_rfqs.unit', 'tc_rfqs.status', 'tc_rfqs.privacy', 'tc_rfqs.created_at',
        'tc_accounts.name as buyer_name', 'tc_accounts.email as buyer_email',
      ])
    if (text(query.status)) statement = statement.where('tc_rfqs.status', '=', text(query.status))
    if (text(query.privacy)) statement = statement.where('tc_rfqs.privacy', '=', text(query.privacy))
    if (text(query.search)) statement = statement.where('tc_rfqs.title', 'like', `%${text(query.search)}%`)
    return { records: await statement.where('tc_rfqs.deleted_at', 'is', null).orderBy('tc_rfqs.created_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async rfq(uuid: string) {
    const database = this.repository.database()
    const rfq = await database.selectFrom('tc_rfqs')
      .innerJoin('tc_accounts', 'tc_accounts.id', 'tc_rfqs.buyer_account_id')
      .leftJoin('tc_categories', 'tc_categories.id', 'tc_rfqs.category_id')
      .selectAll('tc_rfqs')
      .select([
        'tc_accounts.uuid as buyer_account_uuid', 'tc_accounts.name as buyer_name', 'tc_accounts.email as buyer_email',
        'tc_accounts.phone as buyer_phone', 'tc_accounts.role as buyer_role', 'tc_accounts.status as buyer_status',
        'tc_categories.uuid as category_uuid', 'tc_categories.name as category_name', 'tc_categories.slug as category_slug',
      ])
      .where('tc_rfqs.uuid', '=', uuid)
      .where('tc_rfqs.deleted_at', 'is', null)
      .executeTakeFirst()
    if (!rfq) throw new NotFoundException('RFQ was not found.')

    const [buyerCompany, quotes, inquiries] = await Promise.all([
      rfq.buyer_company_id
        ? database.selectFrom('tc_companies')
          .select(['uuid', 'name', 'slug', 'city', 'state', 'verification_level', 'trust_score', 'publication_status'])
          .where('id', '=', rfq.buyer_company_id)
          .executeTakeFirst()
        : Promise.resolve(undefined),
      database.selectFrom('tc_rfq_quotes')
        .innerJoin('tc_companies', 'tc_companies.id', 'tc_rfq_quotes.supplier_company_id')
        .innerJoin('tc_accounts', 'tc_accounts.id', 'tc_rfq_quotes.supplier_account_id')
        .selectAll('tc_rfq_quotes')
        .select([
          'tc_companies.uuid as supplier_company_uuid', 'tc_companies.name as supplier_company_name',
          'tc_companies.city as supplier_city', 'tc_companies.verification_level as supplier_verification_level',
          'tc_companies.trust_score as supplier_trust_score', 'tc_accounts.name as supplier_name',
          'tc_accounts.email as supplier_email', 'tc_accounts.phone as supplier_phone',
        ])
        .where('tc_rfq_quotes.rfq_id', '=', rfq.id)
        .orderBy('tc_rfq_quotes.created_at', 'desc')
        .execute(),
      database.selectFrom('tc_inquiries')
        .selectAll()
        .where('rfq_id', '=', rfq.id)
        .orderBy('created_at', 'desc')
        .execute(),
    ])
    return { ...rfq, buyerCompany: buyerCompany ?? null, inquiries, quotes }
  }

  async updateRfqStatus(admin: MarketplaceAdminIdentity, uuid: string, input: ReviewDecisionInput) {
    const allowed = ['under_review', 'open', 'matched', 'quoted', 'negotiation', 'closed', 'cancelled', 'expired', 'archived']
    const status = text(input.status)
    if (!allowed.includes(status)) throw new BadRequestException('Unsupported RFQ status.')
    const database = this.repository.database()
    const rfq = await database.selectFrom('tc_rfqs').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!rfq) throw new NotFoundException('RFQ was not found.')
    await database.updateTable('tc_rfqs').set({ status, updated_at: nowIso() }).where('id', '=', rfq.id).execute()
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'rfq.status_changed',
      entityType: 'rfq',
      entityId: rfq.id,
      oldValues: { status: rfq.status },
      newValues: { status, notes: input.notes },
    })
    return { ok: true, status }
  }

  async inquiries(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_inquiries').selectAll()
    if (text(query.status)) statement = statement.where('status', '=', text(query.status))
    if (text(query.search)) statement = statement.where('message', 'like', `%${text(query.search)}%`)
    return { records: await statement.orderBy('created_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async updateInquiryStatus(admin: MarketplaceAdminIdentity, uuid: string, statusValue: unknown) {
    const status = text(statusValue)
    if (!['new', 'assigned', 'contacted', 'converted', 'closed', 'spam'].includes(status)) {
      throw new BadRequestException('Unsupported inquiry status.')
    }
    const database = this.repository.database()
    const inquiry = await database.selectFrom('tc_inquiries').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!inquiry) throw new NotFoundException('Inquiry was not found.')
    await database.updateTable('tc_inquiries').set({ status, updated_at: nowIso() }).where('id', '=', inquiry.id).execute()
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'inquiry.status_changed',
      entityType: 'inquiry',
      entityId: inquiry.id,
      oldValues: { status: inquiry.status },
      newValues: { status },
    })
    return { ok: true, status }
  }

  async content(type: string, query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_content').selectAll().where('content_type', '=', type).where('deleted_at', 'is', null)
    if (text(query.status)) statement = statement.where('status', '=', text(query.status))
    if (text(query.search)) {
      const search = `%${text(query.search)}%`
      statement = statement.where((expression) => expression.or([
        expression('title', 'like', search),
        expression('category', 'like', search),
        expression('summary', 'like', search),
        expression('body', 'like', search),
      ]))
    }
    const records = await statement.orderBy('updated_at', 'desc').limit(limit).offset(offset).execute()
    if (type !== 'article') return { records, page, limit }
    return { records: await Promise.all(records.map((record) => this.decorateArticle(record))), page, limit }
  }

  async blogTaxonomy(kind: 'categories' | 'tags', query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    const search = text(query.search)
    const result = kind === 'categories'
      ? search
        ? await sql`SELECT * FROM tc_blog_categories WHERE name LIKE ${`%${search}%`} ORDER BY sort_order ASC, name ASC LIMIT ${limit} OFFSET ${offset}`.execute(this.repository.database())
        : await sql`SELECT * FROM tc_blog_categories ORDER BY sort_order ASC, name ASC LIMIT ${limit} OFFSET ${offset}`.execute(this.repository.database())
      : search
        ? await sql`SELECT * FROM tc_blog_tags WHERE name LIKE ${`%${search}%`} ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`.execute(this.repository.database())
        : await sql`SELECT * FROM tc_blog_tags ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`.execute(this.repository.database())
    return { records: result.rows, page, limit }
  }

  async upsertBlogTaxonomy(admin: MarketplaceAdminIdentity, kind: 'categories' | 'tags', input: BlogTaxonomyInput) {
    if (!['super-admin', 'software-admin', 'marketplace-admin', 'content-editor'].includes(admin.role)) {
      throw new ForbiddenException('Content editor access is required.')
    }
    const name = text(input.name)
    if (!name) throw new BadRequestException('Name is required.')
    const uuid = text(input.uuid)
    const tableName = kind === 'categories' ? 'tc_blog_categories' : 'tc_blog_tags'
    const slug = slugify(input.slug || name)
    const status = text(input.status, 'active')
    const existing = uuid
      ? await sql`SELECT * FROM ${sql.raw(tableName)} WHERE uuid = ${uuid} LIMIT 1`.execute(this.repository.database()).then((result) => result.rows[0] as Record<string, unknown> | undefined)
      : undefined
    if (existing) {
      if (kind === 'categories') {
        await sql`UPDATE tc_blog_categories SET name=${name}, slug=${slug}, description=${nullableText(input.description)}, color=${nullableText(input.color)}, sort_order=${Math.round(nullableNumber(input.sortOrder) ?? 0)}, status=${status}, updated_at=${nowIso()} WHERE uuid=${uuid}`.execute(this.repository.database())
      } else {
        await sql`UPDATE tc_blog_tags SET name=${name}, slug=${slug}, description=${nullableText(input.description)}, status=${status}, updated_at=${nowIso()} WHERE uuid=${uuid}`.execute(this.repository.database())
      }
    } else if (kind === 'categories') {
      await sql`INSERT INTO tc_blog_categories (uuid,name,slug,description,color,sort_order,status) VALUES (${generatePublicUuid()},${name},${slug},${nullableText(input.description)},${nullableText(input.color)},${Math.round(nullableNumber(input.sortOrder) ?? 0)},${status})`.execute(this.repository.database())
    } else {
      await sql`INSERT INTO tc_blog_tags (uuid,name,slug,description,status) VALUES (${generatePublicUuid()},${name},${slug},${nullableText(input.description)},${status})`.execute(this.repository.database())
    }
    await this.repository.audit({ actorType: admin.type, actorId: admin.id, action: `blog.${kind}.saved`, entityType: `blog_${kind}`, newValues: input })
    const saved = kind === 'categories'
      ? await sql`SELECT * FROM tc_blog_categories WHERE slug=${slug} LIMIT 1`.execute(this.repository.database())
      : await sql`SELECT * FROM tc_blog_tags WHERE slug=${slug} LIMIT 1`.execute(this.repository.database())
    return saved.rows[0]
  }

  async updateCompanyStatus(admin: MarketplaceAdminIdentity, uuid: string, input: ReviewDecisionInput) {
    const company = await this.repository.findCompanyByUuid(uuid)
    if (!company) throw new NotFoundException('Company was not found.')
    const status = text(input.status)
    if (!['under_review', 'changes_requested', 'approved', 'published', 'suspended', 'archived'].includes(status)) {
      throw new BadRequestException('Unsupported company status.')
    }
    await this.repository.database().updateTable('tc_companies').set({
      publication_status: status,
      published_at: status === 'published' ? nowIso() : company.published_at,
      updated_by: admin.id,
      updated_at: nowIso(),
    }).where('id', '=', company.id).execute()
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'company.status_changed',
      entityType: 'company',
      entityId: company.id,
      oldValues: { status: company.publication_status },
      newValues: { status, notes: input.notes },
    })
    return { ok: true, status }
  }

  async verifications(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database()
      .selectFrom('tc_verification_requests')
      .innerJoin('tc_companies', 'tc_companies.id', 'tc_verification_requests.company_id')
      .select([
        'tc_verification_requests.id', 'tc_verification_requests.uuid', 'tc_verification_requests.level',
        'tc_verification_requests.documents', 'tc_verification_requests.notes', 'tc_verification_requests.status',
        'tc_verification_requests.created_at', 'tc_companies.uuid as company_uuid', 'tc_companies.name as company_name',
      ])
    if (text(query.status)) statement = statement.where('tc_verification_requests.status', '=', text(query.status))
    return { records: await statement.orderBy('tc_verification_requests.created_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  async decideVerification(admin: MarketplaceAdminIdentity, uuid: string, input: ReviewDecisionInput) {
    if (!['super-admin', 'marketplace-admin', 'verifier'].includes(admin.role)) throw new ForbiddenException('Verifier access is required.')
    const status = text(input.status)
    if (!['approved', 'changes_requested', 'archived'].includes(status)) throw new BadRequestException('Unsupported verification decision.')
    const database = this.repository.database()
    const request = await database.selectFrom('tc_verification_requests').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!request) throw new NotFoundException('Verification request was not found.')
    await database.updateTable('tc_verification_requests').set({
      status,
      reviewed_by: admin.id,
      reviewed_at: nowIso(),
      decision_notes: nullableText(input.notes),
      updated_at: nowIso(),
    }).where('id', '=', request.id).execute()
    if (status === 'approved') {
      await database.updateTable('tc_companies').set({
        verification_level: request.level,
        trust_score: trustScore(request.level),
        updated_at: nowIso(),
      }).where('id', '=', request.company_id).execute()
    }
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'verification.decided',
      entityType: 'verification_request',
      entityId: request.id,
      oldValues: { status: request.status },
      newValues: { status, level: request.level, notes: input.notes },
    })
    return { ok: true, status }
  }

  async upsertContent(admin: MarketplaceAdminIdentity, type: string, input: ContentInput) {
    if (!['super-admin', 'software-admin', 'marketplace-admin', 'content-editor'].includes(admin.role)) {
      throw new ForbiddenException('Content editor access is required.')
    }
    if (!['event', 'job', 'article', 'advertisement'].includes(type)) throw new BadRequestException('Unsupported content type.')
    const database = this.repository.database()
    const existing = input.uuid ? await database.selectFrom('tc_content').selectAll().where('uuid', '=', input.uuid).where('content_type', '=', type).executeTakeFirst() : undefined
    const title = text(input.title, existing?.title ?? '')
    if (!title) throw new BadRequestException('Content title is required.')
    const status = text(input.status, existing?.status ?? 'draft')
    const categories = tagList(input.categories ?? input.category)
    const values = {
      title,
      slug: slugify(input.slug || title),
      summary: nullableText(input.summary),
      excerpt: nullableText(input.excerpt),
      body: nullableText(input.body),
      image_url: nullableText(input.imageUrl),
      starts_at: nullableText(input.startsAt),
      ends_at: nullableText(input.endsAt),
      location: nullableText(input.location),
      category: categories[0] ?? nullableText(input.category),
      company_name: nullableText(input.companyName),
      employment_type: nullableText(input.employmentType),
      application_url: nullableText(input.applicationUrl),
      placement: nullableText(input.placement),
      target_url: nullableText(input.targetUrl),
      seo_title: nullableText(input.seoTitle),
      seo_description: nullableText(input.seoDescription),
      canonical_url: nullableText(input.canonicalUrl),
      reading_minutes: nullableNumber(input.readingMinutes),
      allow_comments: booleanValue(input.allowComments, true) ? 1 : 0,
      featured: booleanValue(input.featured, false) ? 1 : 0,
      metadata: json(input.metadata),
      status,
      published_at: status === 'published' ? existing?.published_at ?? nowIso() : existing?.published_at ?? null,
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) {
      await database.updateTable('tc_content').set(values).where('id', '=', existing.id).execute()
    } else {
      id = Number((await database.insertInto('tc_content').values({
        ...values,
        uuid: generatePublicUuid(),
        content_type: type,
        owner_account_id: admin.type === 'marketplace_account' ? admin.id : null,
      }).executeTakeFirst()).insertId)
    }
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: existing ? `${type}.updated` : `${type}.created`,
      entityType: type,
      entityId: id,
      oldValues: existing,
      newValues: values,
    })
    if (type === 'article') {
      await this.syncArticleTags(id!, input.tags ?? input.metadata?.tags)
      await this.syncArticleCategories(id!, categories)
    }
    const saved = await database.selectFrom('tc_content').selectAll().where('id', '=', id!).executeTakeFirst()
    return type === 'article' && saved ? this.decorateArticle(saved) : saved
  }

  async blogComments(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    const status = text(query.status)
    const search = text(query.search)
    const result = await sql`
      SELECT c.*, a.title AS article_title, a.slug AS article_slug, p.uuid AS parent_uuid
      FROM tc_blog_comments c
      INNER JOIN tc_content a ON a.id = c.content_id
      LEFT JOIN tc_blog_comments p ON p.id = c.parent_id
      WHERE (${status} = '' OR c.status = ${status})
        AND (${search} = '' OR c.body LIKE ${`%${search}%`} OR c.author_name LIKE ${`%${search}%`} OR a.title LIKE ${`%${search}%`})
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.execute(this.repository.database())
    return { records: result.rows, page, limit }
  }

  async updateBlogCommentStatus(admin: MarketplaceAdminIdentity, uuid: string, input: { status?: string }) {
    if (!['super-admin', 'software-admin', 'marketplace-admin', 'content-editor'].includes(admin.role)) {
      throw new ForbiddenException('Content editor access is required.')
    }
    const status = text(input.status)
    if (!['pending', 'approved', 'spam', 'archived'].includes(status)) throw new BadRequestException('Unsupported comment status.')
    const comment = await sql`
      SELECT c.id, c.parent_id, p.status AS parent_status
      FROM tc_blog_comments c
      LEFT JOIN tc_blog_comments p ON p.id = c.parent_id
      WHERE c.uuid=${uuid}
      LIMIT 1
    `.execute(this.repository.database()).then((result) => result.rows[0] as { id?: number; parent_id?: number | null; parent_status?: string | null } | undefined)
    if (!comment) throw new NotFoundException('Blog comment was not found.')
    if (status === 'approved' && comment.parent_id && comment.parent_status !== 'approved') {
      throw new BadRequestException('Approve the parent comment before approving this reply.')
    }
    await sql`UPDATE tc_blog_comments SET status=${status}, updated_at=${nowIso()} WHERE uuid=${uuid}`.execute(this.repository.database())
    await this.repository.audit({ actorType: admin.type, actorId: admin.id, action: 'blog.comment.status_changed', entityType: 'blog_comment', newValues: { uuid, status } })
    return { ok: true, status }
  }

  private async syncArticleTags(contentId: number, rawTags: unknown) {
    const tags = tagList(rawTags)
    await sql`DELETE FROM tc_blog_article_tags WHERE content_id=${contentId}`.execute(this.repository.database())
    for (const name of tags) {
      const slug = slugify(name)
      await sql`INSERT INTO tc_blog_tags (uuid,name,slug,status) VALUES (${generatePublicUuid()},${name},${slug},'active') ON DUPLICATE KEY UPDATE name=VALUES(name), status='active'`.execute(this.repository.database())
      const tag = await sql`SELECT id FROM tc_blog_tags WHERE slug=${slug} LIMIT 1`.execute(this.repository.database())
      const tagId = Number((tag.rows[0] as { id?: number } | undefined)?.id ?? 0)
      if (tagId) await sql`INSERT IGNORE INTO tc_blog_article_tags (content_id, tag_id) VALUES (${contentId}, ${tagId})`.execute(this.repository.database())
    }
  }

  private async syncArticleCategories(contentId: number, rawCategories: unknown) {
    const categories = tagList(rawCategories)
    await sql`DELETE FROM tc_blog_article_categories WHERE content_id=${contentId}`.execute(this.repository.database())
    for (const value of categories) {
      const slug = slugify(value)
      const category = await sql`SELECT id FROM tc_blog_categories WHERE slug=${slug} OR name=${value} LIMIT 1`.execute(this.repository.database())
      const categoryId = Number((category.rows[0] as { id?: number } | undefined)?.id ?? 0)
      if (categoryId) await sql`INSERT IGNORE INTO tc_blog_article_categories (content_id, category_id) VALUES (${contentId}, ${categoryId})`.execute(this.repository.database())
    }
  }

  private async decorateArticle<T extends Record<string, unknown>>(record: T) {
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
    return { ...record, tags: tags.rows, categories: categories.rows }
  }

  async upsertPlan(admin: MarketplaceAdminIdentity, input: Record<string, unknown>) {
    if (!['super-admin', 'marketplace-admin'].includes(admin.role)) throw new ForbiddenException('Marketplace administrator access is required.')
    const database = this.repository.database()
    const uuid = text(input.uuid)
    const existing = uuid ? await database.selectFrom('tc_membership_plans').selectAll().where('uuid', '=', uuid).executeTakeFirst() : undefined
    const planKey = slugify(input.planKey || input.name)
    const name = text(input.name)
    if (!planKey || !name) throw new BadRequestException('Plan key and name are required.')
    const values = {
      plan_key: planKey,
      name,
      description: nullableText(input.description),
      price_paise: Math.max(0, Math.round(nullableNumber(input.pricePaise) ?? 0)),
      currency: text(input.currency, 'INR').toUpperCase().slice(0, 3),
      billing_cycle: text(input.billingCycle, 'monthly'),
      lead_limit: nullableNumber(input.leadLimit),
      product_limit: nullableNumber(input.productLimit),
      features: json(input.features),
      sort_order: Math.round(nullableNumber(input.sortOrder) ?? 0),
      status: text(input.status, 'active'),
      updated_at: nowIso(),
    }
    if (existing) await database.updateTable('tc_membership_plans').set(values).where('id', '=', existing.id).execute()
    else await database.insertInto('tc_membership_plans').values({ ...values, uuid: generatePublicUuid() }).execute()
    await this.repository.audit({ actorType: admin.type, actorId: admin.id, action: 'membership_plan.upserted', entityType: 'membership_plan', entityId: existing?.id, newValues: values })
    return database.selectFrom('tc_membership_plans').selectAll().orderBy('sort_order', 'asc').execute()
  }

  async auditLogs(query: ListQuery) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_audit_logs').selectAll()
    if (text(query.search)) statement = statement.where('action', 'like', `%${text(query.search)}%`)
    return { records: await statement.orderBy('created_at', 'desc').limit(limit).offset(offset).execute(), page, limit }
  }

  private async applyApprovedRevision(
    submission: { id: number; source_tenant_id: number; external_record_uuid: string; entity_type: string },
    revision: { id: number; payload: string },
    publish: boolean,
  ) {
    const payload = parsePayload(revision.payload)
    if (submission.entity_type === 'company') {
      await this.applyCompanyRevision(submission, revision.id, payload, publish)
      return
    }
    if (submission.entity_type === 'product') {
      await this.applyProductRevision(submission, revision.id, payload, publish)
    }
  }

  private async applyCompanyRevision(
    submission: { source_tenant_id: number; external_record_uuid: string },
    revisionId: number,
    payload: Record<string, unknown>,
    publish: boolean,
  ) {
    const database = this.repository.database()
    const existing = await database.selectFrom('tc_companies').selectAll()
      .where('source_type', '=', 'billing_connector')
      .where('source_tenant_id', '=', submission.source_tenant_id)
      .where('external_record_uuid', '=', submission.external_record_uuid)
      .executeTakeFirst()
    const name = text(payload.name || payload.brandName || payload.companyName)
    if (!name) throw new BadRequestException('Connector company payload requires a name.')
    const values = {
      current_revision_id: revisionId,
      name,
      legal_name: nullableText(payload.legalName),
      slug: slugify(payload.slug || `${name}-${submission.source_tenant_id}`),
      description: nullableText(payload.description || payload.about),
      business_type: nullableText(payload.businessType),
      gstin: nullableText(payload.gstin),
      iec_number: nullableText(payload.iecNumber),
      email: nullableText(payload.email),
      phone: nullableText(payload.phone),
      whatsapp: nullableText(payload.whatsapp),
      website: nullableText(payload.website),
      address: nullableText(payload.address || payload.factoryAddress),
      city: nullableText(payload.city),
      state: nullableText(payload.state),
      country: nullableText(payload.country),
      pincode: nullableText(payload.pincode),
      monthly_capacity: nullableText(payload.monthlyCapacity),
      minimum_order_quantity: nullableNumber(payload.minimumOrderQuantity || payload.minOrderQty),
      lead_time: nullableText(payload.leadTime),
      certifications: json(payload.certifications),
      export_markets: json(payload.exportMarkets),
      publication_status: publish ? 'published' : 'approved',
      published_at: publish ? nowIso() : existing?.published_at ?? null,
      updated_at: nowIso(),
    }
    if (existing) await database.updateTable('tc_companies').set(values).where('id', '=', existing.id).execute()
    else await database.insertInto('tc_companies').values({
      ...values,
      uuid: generatePublicUuid(),
      source_type: 'billing_connector',
      source_tenant_id: submission.source_tenant_id,
      external_record_uuid: submission.external_record_uuid,
      verification_level: 'none',
      trust_score: 0,
      membership_tier: 'free',
    }).execute()
  }

  private async applyProductRevision(
    submission: { source_tenant_id: number; external_record_uuid: string },
    revisionId: number,
    payload: Record<string, unknown>,
    publish: boolean,
  ) {
    const database = this.repository.database()
    const companyExternalUuid = text(payload.companyExternalUuid || payload.supplierExternalUuid)
    const company = await database.selectFrom('tc_companies').select('id')
      .where('source_type', '=', 'billing_connector')
      .where('source_tenant_id', '=', submission.source_tenant_id)
      .where('external_record_uuid', '=', companyExternalUuid)
      .executeTakeFirst()
    if (!company) throw new BadRequestException('Approve the connector company before its products.')
    const existing = await database.selectFrom('tc_products').selectAll().where('company_id', '=', company.id).where('external_record_uuid', '=', submission.external_record_uuid).executeTakeFirst()
    const name = text(payload.name)
    if (!name) throw new BadRequestException('Connector product payload requires a name.')
    const values = {
      current_revision_id: revisionId,
      name,
      slug: slugify(payload.slug || name),
      sku: nullableText(payload.sku),
      description: nullableText(payload.description),
      unit: nullableText(payload.unit),
      price_from: nullableNumber(payload.priceFrom),
      currency: text(payload.currency, 'INR').toUpperCase().slice(0, 3),
      moq: nullableNumber(payload.moq),
      lead_time: nullableText(payload.leadTime),
      fabric_details: nullableText(payload.fabricDetails),
      sizes: json(payload.sizes),
      colours: json(payload.colours),
      certifications: json(payload.certifications),
      media: json(payload.media),
      publication_status: publish ? 'published' : 'approved',
      published_at: publish ? nowIso() : existing?.published_at ?? null,
      updated_at: nowIso(),
    }
    if (existing) await database.updateTable('tc_products').set(values).where('id', '=', existing.id).execute()
    else await database.insertInto('tc_products').values({
      ...values,
      uuid: generatePublicUuid(),
      company_id: company.id,
      source_type: 'billing_connector',
      external_record_uuid: submission.external_record_uuid,
    }).execute()
  }
}

async function count(
  database: ReturnType<TirupurConnectRepository['database']>,
  table: 'tc_companies' | 'tc_rfqs' | 'tc_rfq_quotes',
) {
  const row = await database.selectFrom(table).select(({ fn }) => fn.count<number>('id').as('count')).executeTakeFirst()
  return Number(row?.count ?? 0)
}

function trustScore(level: string) {
  const scores: Record<string, number> = { basic: 20, gst: 40, iec: 55, factory: 75, export: 85, premium: 95 }
  return scores[level.toLowerCase()] ?? 20
}

function parsePayload(value: string) {
  try {
    const payload = JSON.parse(value) as unknown
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true
    if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false
  }
  return fallback
}

function tagList(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',')
  return [...new Set(raw.map((item) => text(item)).filter(Boolean))].slice(0, 20)
}
