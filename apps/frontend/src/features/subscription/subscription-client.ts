import { authHeaders, platformApiBaseUrl, type AuthSession } from "src/features/auth/auth-client"

export interface SubscriptionApp {
  id: number
  uuid: string
  app_key: string
  name: string
  summary: string
  feature_summary: string
  base_price_paise: number
  currency: string
  status: string
  sort_order: number
  is_core?: boolean
}

export interface SubscriptionPlan {
  id: number
  uuid: string
  plan_key: string
  name: string
  summary: string
  billing_cycle: "monthly" | "yearly"
  currency: string
  base_price_paise: number
  status: string
  sort_order: number
  apps: { app_key: string; price_override_paise: number | null }[]
}

export interface TenantSubscription {
  id: number
  uuid: string
  tenant_id: number
  tenant_slug: string
  tenant_name: string
  plan_uuid: string | null
  plan_name: string | null
  status: string
  billing_cycle: string
  currency: string
  amount_paise: number
  current_period_start: string | null
  current_period_end: string | null
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  apps: { app_key: string; is_enabled: boolean; unit_price_paise: number }[]
}

export interface SubscriptionCatalog {
  apps: SubscriptionApp[]
  plans: SubscriptionPlan[]
  subscriptions: TenantSubscription[]
  razorpay: { key_id: string | null; configured: boolean }
}

export interface TenantSubscriptionCatalog {
  apps: SubscriptionApp[]
  plans: SubscriptionPlan[]
  subscription: TenantSubscription | null
  razorpay: { key_id: string | null; configured: boolean }
}

export interface SubscriptionPlanInput {
  uuid?: string
  plan_key: string
  name: string
  summary?: string
  billing_cycle?: "monthly" | "yearly"
  currency?: string
  base_price_paise?: number
  status?: string
  sort_order?: number
  app_keys?: string[]
  plan_apps?: { app_key: string; price_override_paise?: number | null }[]
}

export interface TenantSubscriptionInput {
  tenant_id: number
  plan_uuid?: string
  app_keys?: string[]
  status?: string
  billing_cycle?: "monthly" | "yearly"
  current_period_end?: string | null
}

export async function getSubscriptionCatalog(session: AuthSession) {
  return request<SubscriptionCatalog>(session, "/api/v1/subscriptions/catalog")
}

export async function getMySubscriptionCatalog(session: AuthSession) {
  return request<TenantSubscriptionCatalog>(session, "/api/v1/subscriptions/me/catalog")
}

export async function upsertSubscriptionPlan(session: AuthSession, input: SubscriptionPlanInput) {
  return request<SubscriptionCatalog>(session, "/api/v1/subscriptions/plans", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function applyTenantSubscription(session: AuthSession, input: TenantSubscriptionInput) {
  return request<SubscriptionCatalog>(session, "/api/v1/subscriptions/tenant-subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function suspendTenantSubscription(session: AuthSession, uuid: string) {
  return request<SubscriptionCatalog>(session, `/api/v1/subscriptions/tenant-subscriptions/${uuid}/suspend`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function restoreTenantSubscription(session: AuthSession, uuid: string) {
  return request<SubscriptionCatalog>(session, `/api/v1/subscriptions/tenant-subscriptions/${uuid}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function extendTenantSubscription(session: AuthSession, uuid: string, days: number) {
  return request<SubscriptionCatalog>(session, `/api/v1/subscriptions/tenant-subscriptions/${uuid}/extend`, {
    method: "POST",
    body: JSON.stringify({ days }),
  })
}

export async function createRazorpaySubscriptionOrder(session: AuthSession, input: { tenant_id: number; subscription_uuid?: string; plan_uuid?: string; app_keys?: string[]; amount_paise?: number }) {
  return request<{ order: Record<string, unknown>; key_id: string }>(session, "/api/v1/subscriptions/razorpay/order", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function confirmRazorpaySubscriptionPayment(session: AuthSession, input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  return request<{ ok: boolean }>(session, "/api/v1/subscriptions/razorpay/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createMyRazorpaySubscriptionOrder(session: AuthSession, input: { plan_uuid?: string; app_keys?: string[]; amount_paise?: number }) {
  return request<{ order: Record<string, unknown>; key_id: string }>(session, "/api/v1/subscriptions/me/razorpay/order", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function confirmMyRazorpaySubscriptionPayment(session: AuthSession, input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  return request<{ ok: boolean }>(session, "/api/v1/subscriptions/me/razorpay/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

async function request<T>(session: AuthSession, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${platformApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error ?? `Subscription request failed with status ${response.status}.`)
  }
  return payload as T
}
