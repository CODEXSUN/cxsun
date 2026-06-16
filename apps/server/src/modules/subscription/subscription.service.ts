import { createHmac, timingSafeEqual } from 'crypto'
import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { nowIso } from '../../infrastructure/database/database-module.js'
import { settings } from '../../framework/config/index.js'
import { ForbiddenException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { generatePublicUuid } from '../../shared/helpers/public-uuid.js'
import type { SubscriptionPlanInput, TenantSubscriptionInput } from './subscription.types.js'

const coreAppKeys = ['application', 'agent-os']

@Injectable()
export class SubscriptionService {
  async catalog() {
    const database = getDatabase()
    const [apps, planRows, tenantRows] = await Promise.all([
      database.selectFrom('subscription_apps').selectAll().orderBy('sort_order', 'asc').orderBy('name', 'asc').execute(),
      database.selectFrom('subscription_plans').selectAll().orderBy('sort_order', 'asc').orderBy('name', 'asc').execute(),
      database
        .selectFrom('tenant_subscriptions')
        .innerJoin('tenants', 'tenants.id', 'tenant_subscriptions.tenant_id')
        .leftJoin('subscription_plans', 'subscription_plans.id', 'tenant_subscriptions.plan_id')
        .select([
          'tenant_subscriptions.id',
          'tenant_subscriptions.uuid',
          'tenant_subscriptions.tenant_id',
          'tenant_subscriptions.plan_id',
          'tenant_subscriptions.status',
          'tenant_subscriptions.billing_cycle',
          'tenant_subscriptions.currency',
          'tenant_subscriptions.amount_paise',
          'tenant_subscriptions.current_period_start',
          'tenant_subscriptions.current_period_end',
          'tenant_subscriptions.razorpay_customer_id',
          'tenant_subscriptions.razorpay_subscription_id',
          'tenants.slug as tenant_slug',
          'tenants.name as tenant_name',
          'subscription_plans.uuid as plan_uuid',
          'subscription_plans.name as plan_name',
        ])
        .orderBy('tenant_subscriptions.updated_at', 'desc')
        .execute(),
    ])

    const planApps = await database
      .selectFrom('subscription_plan_apps')
      .innerJoin('subscription_apps', 'subscription_apps.id', 'subscription_plan_apps.app_id')
      .select([
        'subscription_plan_apps.plan_id',
        'subscription_plan_apps.is_enabled',
        'subscription_plan_apps.price_override_paise',
        'subscription_apps.app_key',
      ])
      .execute()

    const subscriptionApps = await database
      .selectFrom('tenant_subscription_apps')
      .select(['subscription_id', 'app_key', 'is_enabled', 'unit_price_paise'])
      .execute()

    const plans = planRows.map((plan) => ({
      ...plan,
      apps: planApps
        .filter((row) => row.plan_id === plan.id && row.is_enabled === 1)
        .map((row) => ({ app_key: row.app_key, price_override_paise: row.price_override_paise })),
    }))

    const subscriptions = tenantRows.map((subscription) => ({
      ...subscription,
      apps: subscriptionApps
        .filter((row) => row.subscription_id === subscription.id)
        .map((row) => ({ app_key: row.app_key, is_enabled: row.is_enabled === 1, unit_price_paise: row.unit_price_paise })),
    }))

    return {
      apps: apps.map((app) => ({ ...app, is_core: coreAppKeys.includes(app.app_key) })),
      plans,
      subscriptions,
      razorpay: {
        key_id: settings.razorpay.keyId ?? null,
        configured: Boolean(settings.razorpay.keyId && settings.razorpay.keySecret),
      },
    }
  }

  async tenantCatalog(tenantId: number) {
    const catalog = await this.catalog()
    return {
      apps: catalog.apps.filter((app) => app.status === 'active'),
      plans: catalog.plans.filter((plan) => plan.status === 'active'),
      subscription: catalog.subscriptions.find((subscription) => subscription.tenant_id === tenantId) ?? null,
      razorpay: catalog.razorpay,
    }
  }

  async upsertPlan(input: SubscriptionPlanInput) {
    const database = getDatabase()
    const now = nowIso()
    const planApps = normalizePlanApps(input.plan_apps, input.app_keys)
    const existing = input.uuid
      ? await database.selectFrom('subscription_plans').select(['id', 'uuid']).where('uuid', '=', input.uuid).executeTakeFirst()
      : await database.selectFrom('subscription_plans').select(['id', 'uuid']).where('plan_key', '=', normalizeKey(input.plan_key)).executeTakeFirst()

    const values = {
      plan_key: normalizeKey(input.plan_key),
      name: input.name?.trim() || 'Untitled Plan',
      summary: input.summary?.trim() || '',
      billing_cycle: input.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      currency: (input.currency?.trim().toUpperCase() || 'INR').slice(0, 3),
      base_price_paise: money(input.base_price_paise),
      status: input.status ?? 'active',
      sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0,
      updated_at: now,
    }

    const planId = existing
      ? existing.id
      : Number((await database.insertInto('subscription_plans').values({ ...values, uuid: generatePublicUuid() }).executeTakeFirst()).insertId)

    if (existing) {
      await database.updateTable('subscription_plans').set(values).where('id', '=', existing.id).execute()
    }

    await this.replacePlanApps(planId, planApps)
    return this.catalog()
  }

  async applyTenantSubscription(input: TenantSubscriptionInput) {
    const database = getDatabase()
    const tenant = await database
      .selectFrom('tenants')
      .select(['id', 'payload_settings'])
      .where('id', '=', Number(input.tenant_id))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!tenant) throw new NotFoundException('Tenant not found.')

    const plan = input.plan_uuid
      ? await database.selectFrom('subscription_plans').selectAll().where('uuid', '=', input.plan_uuid).executeTakeFirst()
      : null
    const appKeys = input.app_keys?.length ? normalizeAppKeys(input.app_keys) : plan ? await this.planAppKeys(plan.id) : []
    const pricedApps = await this.pricedApps(appKeys)
    const amount = plan?.base_price_paise ?? pricedApps.reduce((total, app) => total + app.base_price_paise, 0)
    const now = nowIso()

    const existing = await database
      .selectFrom('tenant_subscriptions')
      .select(['id'])
      .where('tenant_id', '=', tenant.id)
      .where('status', 'in', ['trialing', 'active', 'past_due'])
      .orderBy('id', 'desc')
      .executeTakeFirst()

    const values = {
      plan_id: plan?.id ?? null,
      status: input.status ?? 'active',
      billing_cycle: input.billing_cycle ?? plan?.billing_cycle ?? 'monthly',
      currency: plan?.currency ?? 'INR',
      amount_paise: amount,
      started_at: now,
      current_period_start: now,
      current_period_end: input.current_period_end ?? null,
      cancelled_at: null,
      updated_at: now,
    }

    const subscriptionId = existing
      ? existing.id
      : Number((await database.insertInto('tenant_subscriptions').values({ ...values, uuid: generatePublicUuid(), tenant_id: tenant.id }).executeTakeFirst()).insertId)

    if (existing) {
      await database.updateTable('tenant_subscriptions').set(values).where('id', '=', existing.id).execute()
    }

    await this.replaceTenantApps(subscriptionId, pricedApps)
    await this.publishTenantApps(tenant.id, tenant.payload_settings, appKeys)
    return this.catalog()
  }

  async createRazorpayOrder(input: { tenant_id: number; subscription_uuid?: string; plan_uuid?: string; app_keys?: string[]; amount_paise?: number }) {
    if (!settings.razorpay.keyId || !settings.razorpay.keySecret) {
      throw new ForbiddenException('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
    }

    const database = getDatabase()
    const preparedSubscription = input.subscription_uuid
      ? await database
        .selectFrom('tenant_subscriptions')
        .select(['id', 'tenant_id', 'amount_paise', 'currency'])
        .where('uuid', '=', input.subscription_uuid)
        .executeTakeFirst()
      : null
    const subscription = preparedSubscription ?? await this.preparePendingSubscription(input)
    const tenantId = subscription?.tenant_id ?? Number(input.tenant_id)
    const amount = money(input.amount_paise ?? subscription?.amount_paise ?? 0)
    if (!tenantId || amount <= 0) throw new ForbiddenException('A positive subscription amount is required.')

    const receipt = `sub_${tenantId}_${Date.now()}`
    const response = await fetch(`${settings.razorpay.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.razorpay.keyId}:${settings.razorpay.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency: subscription?.currency ?? 'INR', receipt, payment_capture: 1 }),
    })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new ForbiddenException(String(payload.error ?? `Razorpay order failed with status ${response.status}.`))

    const now = nowIso()
    await database.insertInto('subscription_payments').values({
      uuid: generatePublicUuid(),
      tenant_id: tenantId,
      subscription_id: subscription?.id ?? null,
      amount_paise: amount,
      currency: subscription?.currency ?? 'INR',
      status: 'created',
      provider: 'razorpay',
      provider_order_id: typeof payload.id === 'string' ? payload.id : null,
      receipt,
      payload: JSON.stringify(payload),
      updated_at: now,
    }).execute()

    return { order: payload, key_id: settings.razorpay.keyId }
  }

  async confirmRazorpayPayment(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    if (!settings.razorpay.keySecret) throw new ForbiddenException('Razorpay is not configured.')
    const expected = createHmac('sha256', settings.razorpay.keySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex')
    if (!safeEqual(expected, input.razorpay_signature)) throw new ForbiddenException('Invalid Razorpay payment signature.')

    const database = getDatabase()
    const payment = await database
      .selectFrom('subscription_payments')
      .select(['id', 'tenant_id', 'subscription_id'])
      .where('provider_order_id', '=', input.razorpay_order_id)
      .executeTakeFirst()

    await database
      .updateTable('subscription_payments')
      .set({
        status: 'paid',
        provider_payment_id: input.razorpay_payment_id,
        provider_signature: input.razorpay_signature,
        updated_at: nowIso(),
      })
      .where('provider_order_id', '=', input.razorpay_order_id)
      .execute()

    if (payment?.subscription_id) {
      await database
        .updateTable('tenant_subscriptions')
        .set({
          status: 'active',
          started_at: nowIso(),
          current_period_start: nowIso(),
          updated_at: nowIso(),
        })
        .where('id', '=', payment.subscription_id)
        .execute()

      const tenant = await database
        .selectFrom('tenants')
        .select(['id', 'payload_settings'])
        .where('id', '=', payment.tenant_id)
        .executeTakeFirst()
      const apps = await database
        .selectFrom('tenant_subscription_apps')
        .select('app_key')
        .where('subscription_id', '=', payment.subscription_id)
        .where('is_enabled', '=', 1)
        .execute()

      if (tenant) {
        await this.publishTenantApps(tenant.id, tenant.payload_settings, apps.map((app) => app.app_key))
      }
    }

    return { ok: true }
  }

  private async preparePendingSubscription(input: { tenant_id: number; plan_uuid?: string; app_keys?: string[]; amount_paise?: number }) {
    const database = getDatabase()
    const tenant = await database
      .selectFrom('tenants')
      .select(['id'])
      .where('id', '=', Number(input.tenant_id))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!tenant) throw new NotFoundException('Tenant not found.')

    const plan = input.plan_uuid
      ? await database.selectFrom('subscription_plans').selectAll().where('uuid', '=', input.plan_uuid).where('status', '=', 'active').executeTakeFirst()
      : null
    const appKeys = input.app_keys?.length ? normalizeAppKeys(input.app_keys) : plan ? await this.planAppKeys(plan.id) : []
    const pricedApps = await this.pricedApps(appKeys)
    const amount = money(input.amount_paise ?? plan?.base_price_paise ?? pricedApps.reduce((total, app) => total + app.base_price_paise, 0))
    const now = nowIso()

    const subscriptionId = Number((await database.insertInto('tenant_subscriptions').values({
      uuid: generatePublicUuid(),
      tenant_id: tenant.id,
      plan_id: plan?.id ?? null,
      status: 'pending_payment',
      billing_cycle: plan?.billing_cycle ?? 'monthly',
      currency: plan?.currency ?? 'INR',
      amount_paise: amount,
      current_period_start: now,
      updated_at: now,
    }).executeTakeFirst()).insertId)

    await this.replaceTenantApps(subscriptionId, pricedApps)
    return {
      id: subscriptionId,
      tenant_id: tenant.id,
      amount_paise: amount,
      currency: plan?.currency ?? 'INR',
    }
  }

  private async replacePlanApps(planId: number, planApps: Array<{ app_key: string; price_override_paise: number | null }>) {
    const database = getDatabase()
    const apps = await this.pricedApps(planApps.map((app) => app.app_key))
    await database.deleteFrom('subscription_plan_apps').where('plan_id', '=', planId).execute()
    for (const app of apps) {
      const planApp = planApps.find((item) => item.app_key === app.app_key)
      await database.insertInto('subscription_plan_apps').values({
        plan_id: planId,
        app_id: app.id,
        price_override_paise: planApp?.price_override_paise ?? null,
        is_enabled: 1,
      }).execute()
    }
  }

  private async replaceTenantApps(subscriptionId: number, apps: { id: number; app_key: string; base_price_paise: number }[]) {
    const database = getDatabase()
    await database.deleteFrom('tenant_subscription_apps').where('subscription_id', '=', subscriptionId).execute()
    for (const app of apps) {
      await database.insertInto('tenant_subscription_apps').values({
        subscription_id: subscriptionId,
        app_id: app.id,
        app_key: app.app_key,
        is_enabled: 1,
        unit_price_paise: app.base_price_paise,
      }).execute()
    }
  }

  private async planAppKeys(planId: number) {
    const rows = await getDatabase()
      .selectFrom('subscription_plan_apps')
      .innerJoin('subscription_apps', 'subscription_apps.id', 'subscription_plan_apps.app_id')
      .select('subscription_apps.app_key')
      .where('subscription_plan_apps.plan_id', '=', planId)
      .where('subscription_plan_apps.is_enabled', '=', 1)
      .execute()
    return rows.map((row) => row.app_key)
  }

  private async pricedApps(appKeys: string[]) {
    return getDatabase()
      .selectFrom('subscription_apps')
      .select(['id', 'app_key', 'base_price_paise'])
      .where('app_key', 'in', appKeys.filter((key) => key !== 'application'))
      .execute()
  }

  private async publishTenantApps(tenantId: number, payloadSettings: string, appKeys: string[]) {
    const settings = parseJsonObject(payloadSettings)
    const enabled = [...new Set(appKeys.filter((key) => key !== 'application'))]
    await getDatabase()
      .updateTable('tenants')
      .set({
        payload_settings: JSON.stringify({
          ...settings,
          apps: {
            ...(isJsonRecord(settings.apps) ? settings.apps : {}),
            enabled,
            subscriptionManaged: true,
            publishedAt: new Date().toISOString(),
          },
        }),
        updated_at: nowIso(),
      })
      .where('id', '=', tenantId)
      .execute()
  }
}

function normalizeAppKeys(values: unknown): string[] {
  return Array.isArray(values)
    ? [...new Set(values.map(String).map(normalizeKey).filter(Boolean))]
    : []
}

function normalizePlanApps(planApps: unknown, fallbackAppKeys: unknown): Array<{ app_key: string; price_override_paise: number | null }> {
  if (Array.isArray(planApps)) {
    const rows = planApps
      .map((item) => isJsonRecord(item) ? {
        app_key: normalizeKey(item.app_key),
        price_override_paise: nullableMoney(item.price_override_paise),
      } : null)
      .filter((item): item is { app_key: string; price_override_paise: number | null } => Boolean(item?.app_key))

    return [...new Map(rows.map((row) => [row.app_key, row])).values()]
  }

  return normalizeAppKeys(fallbackAppKeys).map((appKey) => ({ app_key: appKey, price_override_paise: null }))
}

function normalizeKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
}

function money(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

function nullableMoney(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}') as unknown
    return isJsonRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
