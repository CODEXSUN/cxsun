export type SubscriptionBillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'pending_payment' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended'
export type SubscriptionPlanStatus = 'active' | 'inactive' | 'archived'
export type SubscriptionPaymentStatus = 'created' | 'paid' | 'failed' | 'cancelled'

export interface SubscriptionAppInput {
  app_key: string
  name: string
  summary?: string
  feature_summary?: string
  base_price_paise?: number
  currency?: string
  status?: 'active' | 'inactive'
  sort_order?: number
}

export interface SubscriptionPlanInput {
  uuid?: string
  plan_key: string
  name: string
  summary?: string
  billing_cycle?: SubscriptionBillingCycle
  currency?: string
  base_price_paise?: number
  status?: SubscriptionPlanStatus
  sort_order?: number
  app_keys?: string[]
  plan_apps?: Array<{
    app_key: string
    price_override_paise?: number | null
  }>
}

export interface TenantSubscriptionInput {
  tenant_id: number
  plan_uuid?: string
  app_keys?: string[]
  status?: SubscriptionStatus
  billing_cycle?: SubscriptionBillingCycle
  current_period_end?: string | null
}
