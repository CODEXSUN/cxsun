import { createHmac, timingSafeEqual } from 'crypto'
import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { settings } from '../../../framework/config/index.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import { assertMarketplaceRole } from '../domain/tirupur-connect.policy.js'
import type {
  CompanyInput, MarketplaceIdentity, ProductInput, QuoteInput, RfqInput, VerificationRequestInput,
} from '../domain/tirupur-connect.types.js'
import {
  json, nullableNumber, nullableText, numberValue, slugify, text, TirupurConnectRepository,
} from '../infrastructure/tirupur-connect.repository.js'

@Injectable()
export class TirupurConnectMemberService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async upsertCompany(identity: MarketplaceIdentity, input: CompanyInput) {
    assertMarketplaceRole(identity, ['supplier', 'supplier-staff', 'association', 'marketplace-admin'])
    const database = this.repository.database()
    const existing = await this.repository.findCompanyByAccount(identity.accountId)
    const name = text(input.name, existing?.name ?? '')
    if (!name) throw new BadRequestException('Company name is required.')
    const desiredSlug = slugify(input.slug || name)
    const slugOwner = await this.repository.findCompanyBySlug(desiredSlug)
    if (slugOwner && slugOwner.id !== existing?.id) throw new BadRequestException('Company slug is already used.')

    const values = {
      name,
      legal_name: nullableText(input.legalName),
      slug: desiredSlug,
      description: nullableText(input.description),
      business_type: nullableText(input.businessType),
      gstin: nullableText(input.gstin),
      iec_number: nullableText(input.iecNumber),
      email: nullableText(input.email) ?? identity.email,
      phone: nullableText(input.phone),
      whatsapp: nullableText(input.whatsapp),
      contact_person_name: nullableText(input.contactPersonName),
      contact_person_designation: nullableText(input.contactPersonDesignation),
      contact_person_email: nullableText(input.contactPersonEmail),
      contact_person_phone: nullableText(input.contactPersonPhone),
      contact_person_whatsapp: nullableText(input.contactPersonWhatsapp),
      website: nullableText(input.website),
      address: nullableText(input.address),
      city: nullableText(input.city),
      state: nullableText(input.state),
      country: nullableText(input.country),
      pincode: nullableText(input.pincode),
      latitude: nullableNumber(input.latitude),
      longitude: nullableNumber(input.longitude),
      year_established: nullableNumber(input.yearEstablished),
      employee_count: nullableNumber(input.employeeCount),
      factory_size: nullableText(input.factorySize),
      monthly_capacity: nullableText(input.monthlyCapacity),
      minimum_order_quantity: nullableNumber(input.minimumOrderQuantity),
      lead_time: nullableText(input.leadTime),
      export_markets: json(input.exportMarkets),
      certifications: json(input.certifications),
      social_links: json(input.socialLinks),
      logo_url: nullableText(input.logoUrl),
      cover_url: nullableText(input.coverUrl),
      updated_by: identity.accountId,
      updated_at: nowIso(),
    }
    let companyId = existing?.id
    if (existing) {
      await database.updateTable('tc_companies').set(values).where('id', '=', existing.id).execute()
    } else {
      companyId = Number((await database.insertInto('tc_companies').values({
        ...values,
        uuid: generatePublicUuid(),
        account_id: identity.accountId,
        source_type: 'web',
        publication_status: 'draft',
        verification_level: 'none',
        trust_score: 0,
        membership_tier: 'free',
        created_by: identity.accountId,
      }).executeTakeFirst()).insertId)
    }
    await this.repository.replaceCompanyCategories(companyId!, input.categoryUuids ?? [])
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: existing ? 'company.updated' : 'company.created',
      entityType: 'company',
      entityId: companyId,
      oldValues: existing,
      newValues: values,
    })
    return this.company(identity)
  }

  async submitCompany(identity: MarketplaceIdentity) {
    const company = await this.requireCompany(identity)
    await this.repository.database().updateTable('tc_companies').set({
      publication_status: 'submitted',
      updated_by: identity.accountId,
      updated_at: nowIso(),
    }).where('id', '=', company.id).execute()
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'company.submitted',
      entityType: 'company',
      entityId: company.id,
    })
    return { ok: true, status: 'submitted' }
  }

  async company(identity: MarketplaceIdentity) {
    const company = await this.repository.findCompanyByAccount(identity.accountId)
    if (!company) return null
    const categories = await this.repository.database()
      .selectFrom('tc_company_categories')
      .innerJoin('tc_categories', 'tc_categories.id', 'tc_company_categories.category_id')
      .select(['tc_categories.uuid', 'tc_categories.name', 'tc_categories.slug'])
      .where('tc_company_categories.company_id', '=', company.id)
      .execute()
    return { ...company, categories }
  }

  async products(identity: MarketplaceIdentity) {
    const company = await this.requireCompany(identity)
    return this.repository.database().selectFrom('tc_products').selectAll().where('company_id', '=', company.id).where('deleted_at', 'is', null).orderBy('updated_at', 'desc').execute()
  }

  async upsertProduct(identity: MarketplaceIdentity, input: ProductInput) {
    assertMarketplaceRole(identity, ['supplier', 'supplier-staff', 'marketplace-admin'])
    const company = await this.requireCompany(identity)
    const database = this.repository.database()
    const existing = input.uuid
      ? await database.selectFrom('tc_products').selectAll().where('uuid', '=', input.uuid).where('company_id', '=', company.id).executeTakeFirst()
      : undefined
    const name = text(input.name, existing?.name ?? '')
    if (!name) throw new BadRequestException('Product name is required.')
    const category = await this.repository.findCategoryByUuid(input.categoryUuid)
    const values = {
      category_id: category?.id ?? null,
      name,
      slug: slugify(input.slug || name),
      sku: nullableText(input.sku),
      description: nullableText(input.description),
      unit: nullableText(input.unit),
      price_from: nullableNumber(input.priceFrom),
      currency: text(input.currency, 'INR').toUpperCase().slice(0, 3),
      moq: nullableNumber(input.moq),
      lead_time: nullableText(input.leadTime),
      fabric_details: nullableText(input.fabricDetails),
      sizes: json(input.sizes),
      colours: json(input.colours),
      certifications: json(input.certifications),
      media: json(input.media),
      publication_status: input.status === 'submitted' ? 'submitted' : existing?.publication_status ?? 'draft',
      updated_by: identity.accountId,
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) {
      await database.updateTable('tc_products').set(values).where('id', '=', existing.id).execute()
    } else {
      id = Number((await database.insertInto('tc_products').values({
        ...values,
        uuid: generatePublicUuid(),
        company_id: company.id,
        source_type: 'web',
        created_by: identity.accountId,
      }).executeTakeFirst()).insertId)
    }
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: existing ? 'product.updated' : 'product.created',
      entityType: 'product',
      entityId: id,
      oldValues: existing,
      newValues: values,
    })
    return database.selectFrom('tc_products').selectAll().where('id', '=', id!).executeTakeFirst()
  }

  async rfqs(identity: MarketplaceIdentity) {
    if (identity.role === 'buyer') {
      return this.repository.database().selectFrom('tc_rfqs').selectAll().where('buyer_account_id', '=', identity.accountId).where('deleted_at', 'is', null).orderBy('created_at', 'desc').execute()
    }
    return this.repository.database().selectFrom('tc_rfqs').selectAll().where('status', 'in', ['open', 'matched', 'quoted', 'negotiation']).where('deleted_at', 'is', null).orderBy('created_at', 'desc').execute()
  }

  async upsertRfq(identity: MarketplaceIdentity, input: RfqInput) {
    assertMarketplaceRole(identity, ['buyer', 'marketplace-admin'])
    const database = this.repository.database()
    const existing = input.uuid
      ? await database.selectFrom('tc_rfqs').selectAll().where('uuid', '=', input.uuid).where('buyer_account_id', '=', identity.accountId).executeTakeFirst()
      : undefined
    const title = text(input.title, existing?.title ?? '')
    if (!title) throw new BadRequestException('RFQ title is required.')
    const category = await this.repository.findCategoryByUuid(input.categoryUuid)
    const values = {
      category_id: category?.id ?? null,
      title,
      description: nullableText(input.description),
      quantity: numberValue(input.quantity),
      unit: nullableText(input.unit),
      target_price: nullableNumber(input.targetPrice),
      currency: text(input.currency, 'INR').toUpperCase().slice(0, 3),
      delivery_date: nullableText(input.deliveryDate),
      delivery_location: nullableText(input.deliveryLocation),
      certifications: json(input.certifications),
      attachments: json(input.attachments),
      privacy: input.privacy ?? 'public',
      status: existing?.status ?? 'under_review',
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) {
      await database.updateTable('tc_rfqs').set(values).where('id', '=', existing.id).execute()
    } else {
      id = Number((await database.insertInto('tc_rfqs').values({
        ...values,
        uuid: generatePublicUuid(),
        buyer_account_id: identity.accountId,
        buyer_company_id: identity.companyId,
      }).executeTakeFirst()).insertId)
    }
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: existing ? 'rfq.updated' : 'rfq.created',
      entityType: 'rfq',
      entityId: id,
      oldValues: existing,
      newValues: values,
    })
    return database.selectFrom('tc_rfqs').selectAll().where('id', '=', id!).executeTakeFirst()
  }

  async quote(identity: MarketplaceIdentity, rfqUuid: string, input: QuoteInput) {
    assertMarketplaceRole(identity, ['supplier', 'supplier-staff', 'marketplace-admin'])
    const company = await this.requireCompany(identity)
    const database = this.repository.database()
    const rfq = await database.selectFrom('tc_rfqs').selectAll().where('uuid', '=', rfqUuid).where('status', 'in', ['open', 'matched', 'quoted', 'negotiation']).executeTakeFirst()
    if (!rfq) throw new NotFoundException('Open RFQ was not found.')
    const existing = await database.selectFrom('tc_rfq_quotes').selectAll().where('rfq_id', '=', rfq.id).where('supplier_company_id', '=', company.id).executeTakeFirst()
    const values = {
      price_per_unit: nullableNumber(input.pricePerUnit),
      total_amount: nullableNumber(input.totalAmount),
      currency: text(input.currency, 'INR').toUpperCase().slice(0, 3),
      quantity: nullableNumber(input.quantity),
      lead_time: nullableText(input.leadTime),
      validity_date: nullableText(input.validityDate),
      notes: nullableText(input.notes),
      attachments: json(input.attachments),
      status: 'submitted',
      updated_at: nowIso(),
    }
    let id = existing?.id
    if (existing) {
      await database.updateTable('tc_rfq_quotes').set(values).where('id', '=', existing.id).execute()
    } else {
      id = Number((await database.insertInto('tc_rfq_quotes').values({
        ...values,
        uuid: generatePublicUuid(),
        rfq_id: rfq.id,
        supplier_account_id: identity.accountId,
        supplier_company_id: company.id,
      }).executeTakeFirst()).insertId)
    }
    await database.updateTable('tc_rfqs').set({ status: 'quoted', updated_at: nowIso() }).where('id', '=', rfq.id).execute()
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'rfq.quote_submitted',
      entityType: 'rfq_quote',
      entityId: id,
      newValues: values,
      metadata: { rfqUuid },
    })
    return database.selectFrom('tc_rfq_quotes').selectAll().where('id', '=', id!).executeTakeFirst()
  }

  async quotes(identity: MarketplaceIdentity) {
    const database = this.repository.database()
    if (identity.role === 'buyer') {
      return database
        .selectFrom('tc_rfq_quotes')
        .innerJoin('tc_rfqs', 'tc_rfqs.id', 'tc_rfq_quotes.rfq_id')
        .innerJoin('tc_companies', 'tc_companies.id', 'tc_rfq_quotes.supplier_company_id')
        .select([
          'tc_rfq_quotes.uuid', 'tc_rfq_quotes.price_per_unit', 'tc_rfq_quotes.total_amount',
          'tc_rfq_quotes.currency', 'tc_rfq_quotes.lead_time', 'tc_rfq_quotes.notes',
          'tc_rfq_quotes.status', 'tc_rfq_quotes.created_at', 'tc_rfqs.uuid as rfq_uuid',
          'tc_rfqs.title as rfq_title', 'tc_companies.uuid as supplier_company_uuid',
          'tc_companies.name as supplier_company_name',
        ])
        .where('tc_rfqs.buyer_account_id', '=', identity.accountId)
        .orderBy('tc_rfq_quotes.created_at', 'desc')
        .execute()
    }
    return database
      .selectFrom('tc_rfq_quotes')
      .innerJoin('tc_rfqs', 'tc_rfqs.id', 'tc_rfq_quotes.rfq_id')
      .select([
        'tc_rfq_quotes.uuid', 'tc_rfq_quotes.price_per_unit', 'tc_rfq_quotes.total_amount',
        'tc_rfq_quotes.currency', 'tc_rfq_quotes.lead_time', 'tc_rfq_quotes.notes',
        'tc_rfq_quotes.status', 'tc_rfq_quotes.created_at', 'tc_rfqs.uuid as rfq_uuid',
        'tc_rfqs.title as rfq_title',
      ])
      .where('tc_rfq_quotes.supplier_account_id', '=', identity.accountId)
      .orderBy('tc_rfq_quotes.created_at', 'desc')
      .execute()
  }

  async requestVerification(identity: MarketplaceIdentity, input: VerificationRequestInput) {
    assertMarketplaceRole(identity, ['supplier', 'marketplace-admin'])
    const company = await this.requireCompany(identity)
    const level = text(input.level)
    if (!level) throw new BadRequestException('Verification level is required.')
    const uuid = generatePublicUuid()
    await this.repository.database().insertInto('tc_verification_requests').values({
      uuid,
      company_id: company.id,
      requested_by: identity.accountId,
      level,
      documents: json(input.documents),
      notes: nullableText(input.notes),
      status: 'submitted',
    }).execute()
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'verification.requested',
      entityType: 'verification_request',
      newValues: { uuid, companyId: company.id, level },
    })
    return { ok: true, uuid, status: 'submitted' }
  }

  async selectMembership(identity: MarketplaceIdentity, planUuid: string) {
    const company = await this.requireCompany(identity)
    const database = this.repository.database()
    const plan = await database.selectFrom('tc_membership_plans').selectAll().where('uuid', '=', planUuid).where('status', '=', 'active').executeTakeFirst()
    if (!plan) throw new NotFoundException('Membership plan was not found.')
    const uuid = generatePublicUuid()
    await database.insertInto('tc_memberships').values({
      uuid,
      company_id: company.id,
      plan_id: plan.id,
      status: plan.price_paise === 0 ? 'active' : 'pending_payment',
      started_at: plan.price_paise === 0 ? nowIso() : null,
      payment_status: plan.price_paise === 0 ? 'paid' : 'pending',
    }).execute()
    if (plan.price_paise === 0) {
      await database.updateTable('tc_companies').set({ membership_tier: plan.plan_key, updated_at: nowIso() }).where('id', '=', company.id).execute()
    }
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'membership.selected',
      entityType: 'membership',
      newValues: { uuid, plan: plan.plan_key, status: plan.price_paise === 0 ? 'active' : 'pending_payment' },
    })
    return { ok: true, uuid, paymentRequired: plan.price_paise > 0 }
  }

  async createMembershipPayment(identity: MarketplaceIdentity, membershipUuid: string) {
    if (!settings.razorpay.keyId || !settings.razorpay.keySecret) {
      throw new ForbiddenException('Razorpay is not configured for marketplace payments.')
    }
    const company = await this.requireCompany(identity)
    const database = this.repository.database()
    const membership = await database
      .selectFrom('tc_memberships')
      .innerJoin('tc_membership_plans', 'tc_membership_plans.id', 'tc_memberships.plan_id')
      .select([
        'tc_memberships.id', 'tc_memberships.uuid', 'tc_memberships.status', 'tc_memberships.payment_status',
        'tc_membership_plans.price_paise', 'tc_membership_plans.currency', 'tc_membership_plans.plan_key',
      ])
      .where('tc_memberships.uuid', '=', membershipUuid)
      .where('tc_memberships.company_id', '=', company.id)
      .executeTakeFirst()
    if (!membership) throw new NotFoundException('Membership was not found.')
    if (membership.payment_status === 'paid') throw new BadRequestException('Membership is already paid.')
    if (membership.price_paise <= 0) throw new BadRequestException('This membership does not require payment.')

    const receipt = `tc_${company.id}_${Date.now()}`
    const response = await fetch(`${settings.razorpay.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.razorpay.keyId}:${settings.razorpay.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: membership.price_paise,
        currency: membership.currency,
        receipt,
        payment_capture: 1,
        notes: { membership_uuid: membership.uuid, plan_key: membership.plan_key },
      }),
    })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || typeof payload.id !== 'string') throw new ForbiddenException('Marketplace payment order could not be created.')
    const paymentUuid = generatePublicUuid()
    await database.insertInto('tc_payments').values({
      uuid: paymentUuid,
      account_id: identity.accountId,
      company_id: company.id,
      membership_id: membership.id,
      purpose: 'membership',
      amount_paise: membership.price_paise,
      currency: membership.currency,
      provider: 'razorpay',
      provider_order_id: payload.id,
      status: 'created',
      payload: JSON.stringify(payload),
    }).execute()
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'membership.payment_created',
      entityType: 'payment',
      newValues: { paymentUuid, membershipUuid, providerOrderId: payload.id },
    })
    return { paymentUuid, order: payload, keyId: settings.razorpay.keyId }
  }

  async confirmMembershipPayment(identity: MarketplaceIdentity, input: {
    providerOrderId?: string
    providerPaymentId?: string
    providerSignature?: string
  }) {
    if (!settings.razorpay.keySecret) throw new ForbiddenException('Razorpay is not configured.')
    const providerOrderId = text(input.providerOrderId)
    const providerPaymentId = text(input.providerPaymentId)
    const providerSignature = text(input.providerSignature)
    const expected = createHmac('sha256', settings.razorpay.keySecret).update(`${providerOrderId}|${providerPaymentId}`).digest('hex')
    if (!safeEqual(expected, providerSignature)) throw new ForbiddenException('Invalid marketplace payment signature.')

    const database = this.repository.database()
    const payment = await database
      .selectFrom('tc_payments')
      .selectAll()
      .where('provider_order_id', '=', providerOrderId)
      .where('account_id', '=', identity.accountId)
      .executeTakeFirst()
    if (!payment || !payment.membership_id) throw new NotFoundException('Marketplace payment was not found.')
    const membership = await database
      .selectFrom('tc_memberships')
      .innerJoin('tc_membership_plans', 'tc_membership_plans.id', 'tc_memberships.plan_id')
      .select(['tc_memberships.id', 'tc_memberships.company_id', 'tc_membership_plans.plan_key', 'tc_membership_plans.billing_cycle'])
      .where('tc_memberships.id', '=', payment.membership_id)
      .executeTakeFirstOrThrow()
    const endsAt = membershipEnd(membership.billing_cycle)
    await database.updateTable('tc_payments').set({
      provider_payment_id: providerPaymentId,
      provider_signature: providerSignature,
      status: 'paid',
      updated_at: nowIso(),
    }).where('id', '=', payment.id).execute()
    await database.updateTable('tc_memberships').set({
      status: 'active',
      payment_status: 'paid',
      payment_reference: providerPaymentId,
      started_at: nowIso(),
      ends_at: endsAt,
      updated_at: nowIso(),
    }).where('id', '=', membership.id).execute()
    await database.updateTable('tc_companies').set({
      membership_tier: membership.plan_key,
      updated_at: nowIso(),
    }).where('id', '=', membership.company_id).execute()
    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: identity.accountId,
      action: 'membership.payment_confirmed',
      entityType: 'payment',
      entityId: payment.id,
      newValues: { providerOrderId, providerPaymentId, membershipId: membership.id },
    })
    return { ok: true, membershipStatus: 'active', endsAt }
  }

  private async requireCompany(identity: MarketplaceIdentity) {
    const company = await this.repository.findCompanyByAccount(identity.accountId)
    if (!company) throw new NotFoundException('Create a marketplace company profile first.')
    return company
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function membershipEnd(cycle: string) {
  const date = new Date()
  if (cycle === 'yearly') date.setFullYear(date.getFullYear() + 1)
  else date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}
