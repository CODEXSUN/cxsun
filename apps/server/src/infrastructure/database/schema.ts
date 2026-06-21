import type { Generated } from 'kysely'

export interface SitePagesTable {
  id: Generated<number>
  slug: string
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
  sort_order: number
}

export interface DbVersionsTable {
  id: Generated<number>
  scope: string
  target_key: string
  version: string
  source: string
  metadata: string | null
  installed_at: Generated<string>
  updated_at: Generated<string>
}

export interface SiteServicesTable {
  id: Generated<number>
  title: string
  description: string
  sort_order: number
}

export interface SitePostsTable {
  id: Generated<number>
  title: string
  excerpt: string
  published_at: string
  sort_order: number
}

export interface SiteMessagesTable {
  id: Generated<number>
  tenant_id: number | null
  tenant_slug: string | null
  domain: string | null
  name: string
  email: string
  message: string
  created_at: Generated<string>
}

export interface IndustriesTable {
  id: Generated<number>
  code: string
  name: string
  status: string
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantsTable {
  id: Generated<number>
  code: number
  corporate_id: string | null
  mobile: string | null
  slug: string
  name: string
  status: string
  db_type: string
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantDomainsTable {
  id: Generated<number>
  tenant_id: number
  domain: string
  label: string
  is_primary: number
  status: string
  settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface AdminUsersTable {
  id: Generated<number>
  name: string
  email: string
  password_hash: string
  role: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface RbacPoliciesTable {
  id: Generated<number>
  code: string
  name: string
  description: string
  created_at: Generated<string>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  tenant_id: number
  policy_code: string
  enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface QueueJobsTable {
  id: Generated<number>
  queue_name: string
  type: string
  payload: string
  status: string
  attempts: number
  progress: number
  result: string | null
  error: string | null
  run_at: string
  started_at: string | null
  finished_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface QueueRuntimeSettingsTable {
  setting_key: string
  setting_value: string
  updated_by: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface GstProviderGlobalSettingsTable {
  id: Generated<number>
  uuid: string
  provider: string
  environment: string
  purpose: string
  base_url: string
  email: string
  client_id: string
  client_secret: string
  ip_address: string
  is_enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ConversationsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number | null
  user_email: string | null
  surface: string
  title: string
  status: string
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface AgentLogsTable {
  id: Generated<number>
  uuid: string
  conversation_id: number | null
  tenant_id: number | null
  agent_id: string
  event_type: string
  model_id: string | null
  input_summary: string | null
  output_summary: string | null
  metadata: string | null
  latency_ms: number | null
  status: string
  error_message: string | null
  created_at: Generated<string>
}

export interface KnowledgeDocumentsTable {
  id: Generated<number>
  uuid: string
  source_type: string
  source_path: string
  title: string
  chunk_key: string
  content: string
  metadata: string | null
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface AgentProviderConnectionsTable {
  id: Generated<number>
  uuid: string
  provider_key: string
  provider_name: string
  provider_kind: string
  base_url: string
  api_key_ciphertext: string
  api_key_iv: string
  api_key_tag: string
  default_model: string
  free_models: string | null
  premium_models: string | null
  is_active: number
  status: string
  last_test_status: string | null
  last_test_message: string | null
  last_tested_at: string | null
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ZetroQueryToolsTable {
  id: Generated<number>
  uuid: string
  tool_key: string
  intent_key: string
  domain: string
  label: string
  description: string | null
  required_fields: string | null
  examples: string | null
  is_active: number
  status: string
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ZetroQueryMappingsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  phrase: string
  normalized_phrase: string
  match_type: string
  tool_key: string
  intent_key: string
  status: string
  hit_count: number
  last_matched_at: string | null
  created_by: string | null
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface ZetroQueryLogsTable {
  id: Generated<number>
  uuid: string
  conversation_id: number | null
  tenant_id: number | null
  tenant_slug: string | null
  user_role: string | null
  question: string
  normalized_question: string
  mapped_intent: string | null
  tool_key: string | null
  mapping_id: number | null
  source: string
  status: string
  missing_fields: string | null
  metadata: string | null
  created_at: Generated<string>
}

export interface SubscriptionAppsTable {
  id: Generated<number>
  uuid: string
  app_key: string
  name: string
  summary: string
  feature_summary: string
  base_price_paise: number
  currency: string
  status: string
  sort_order: number
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface SubscriptionPlansTable {
  id: Generated<number>
  uuid: string
  plan_key: string
  name: string
  summary: string
  billing_cycle: string
  currency: string
  base_price_paise: number
  status: string
  sort_order: number
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface SubscriptionPlanAppsTable {
  id: Generated<number>
  plan_id: number
  app_id: number
  price_override_paise: number | null
  is_enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TenantSubscriptionsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  plan_id: number | null
  status: string
  billing_cycle: string
  currency: string
  amount_paise: number
  started_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TenantSubscriptionAppsTable {
  id: Generated<number>
  subscription_id: number
  app_id: number
  app_key: string
  is_enabled: number
  unit_price_paise: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface SubscriptionPaymentsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  subscription_id: number | null
  amount_paise: number
  currency: string
  status: string
  provider: string
  provider_order_id: string | null
  provider_payment_id: string | null
  provider_signature: string | null
  receipt: string | null
  payload: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcAccountsTable {
  id: Generated<number>
  uuid: string
  name: string
  email: string
  password_hash: string
  phone: string | null
  role: string
  status: string
  email_verified_at: string | null
  last_login_at: string | null
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TcCompaniesTable {
  id: Generated<number>
  uuid: string
  account_id: number | null
  source_type: string
  source_tenant_id: number | null
  external_record_uuid: string | null
  current_revision_id: number | null
  name: string
  legal_name: string | null
  slug: string
  description: string | null
  business_type: string | null
  gstin: string | null
  iec_number: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  contact_person_name: string | null
  contact_person_designation: string | null
  contact_person_email: string | null
  contact_person_phone: string | null
  contact_person_whatsapp: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  year_established: number | null
  employee_count: number | null
  factory_size: string | null
  monthly_capacity: string | null
  minimum_order_quantity: number | null
  lead_time: string | null
  export_markets: string | null
  certifications: string | null
  social_links: string | null
  logo_url: string | null
  cover_url: string | null
  verification_level: string
  trust_score: number
  membership_tier: string
  publication_status: string
  published_at: string | null
  featured_until: string | null
  created_by: number | null
  updated_by: number | null
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TcCategoriesTable {
  id: Generated<number>
  uuid: string
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcCompanyCategoriesTable {
  id: Generated<number>
  company_id: number
  category_id: number
  created_at: Generated<string>
}

export interface TcProductsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  category_id: number | null
  source_type: string
  external_record_uuid: string | null
  current_revision_id: number | null
  name: string
  slug: string
  sku: string | null
  description: string | null
  unit: string | null
  price_from: number | null
  currency: string
  moq: number | null
  lead_time: string | null
  fabric_details: string | null
  sizes: string | null
  colours: string | null
  certifications: string | null
  media: string | null
  publication_status: string
  published_at: string | null
  created_by: number | null
  updated_by: number | null
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TcSubmissionsTable {
  id: Generated<number>
  uuid: string
  source_tenant_id: number
  source_tenant_slug: string
  external_record_uuid: string
  entity_type: string
  latest_revision_id: number | null
  sync_version: number
  status: string
  submitted_at: string
  reviewed_by: number | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcSubmissionRevisionsTable {
  id: Generated<number>
  uuid: string
  submission_id: number
  revision_number: number
  sync_version: number
  payload: string
  payload_hash: string
  status: string
  created_at: Generated<string>
}

export interface TcSyncRequestsTable {
  id: Generated<number>
  uuid: string
  idempotency_key: string
  source_tenant_id: number | null
  signature: string
  payload_hash: string
  status: string
  response_payload: string | null
  created_at: Generated<string>
}

export interface TcRfqsTable {
  id: Generated<number>
  uuid: string
  buyer_account_id: number
  buyer_company_id: number | null
  category_id: number | null
  title: string
  description: string | null
  quantity: number
  unit: string | null
  target_price: number | null
  currency: string
  delivery_date: string | null
  delivery_location: string | null
  certifications: string | null
  attachments: string | null
  privacy: string
  status: string
  expires_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TcRfqQuotesTable {
  id: Generated<number>
  uuid: string
  rfq_id: number
  supplier_account_id: number
  supplier_company_id: number
  price_per_unit: number | null
  total_amount: number | null
  currency: string
  quantity: number | null
  lead_time: string | null
  validity_date: string | null
  notes: string | null
  attachments: string | null
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcInquiriesTable {
  id: Generated<number>
  uuid: string
  company_id: number | null
  product_id: number | null
  rfq_id: number | null
  account_id: number | null
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  message: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcVerificationRequestsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  requested_by: number
  level: string
  documents: string | null
  notes: string | null
  status: string
  reviewed_by: number | null
  reviewed_at: string | null
  decision_notes: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcMembershipPlansTable {
  id: Generated<number>
  uuid: string
  plan_key: string
  name: string
  description: string | null
  price_paise: number
  currency: string
  billing_cycle: string
  lead_limit: number | null
  product_limit: number | null
  features: string | null
  sort_order: number
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcMembershipsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  plan_id: number
  status: string
  started_at: string | null
  ends_at: string | null
  payment_status: string
  payment_reference: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcPaymentsTable {
  id: Generated<number>
  uuid: string
  account_id: number
  company_id: number | null
  membership_id: number | null
  purpose: string
  amount_paise: number
  currency: string
  provider: string
  provider_order_id: string | null
  provider_payment_id: string | null
  provider_signature: string | null
  status: string
  payload: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcContentTable {
  id: Generated<number>
  uuid: string
  content_type: string
  owner_account_id: number | null
  title: string
  slug: string
  summary: string | null
  body: string | null
  image_url: string | null
  starts_at: string | null
  ends_at: string | null
  location: string | null
  category: string | null
  company_name: string | null
  employment_type: string | null
  application_url: string | null
  placement: string | null
  target_url: string | null
  metadata: string | null
  status: string
  published_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TcAuditLogsTable {
  id: Generated<number>
  uuid: string
  actor_type: string
  actor_id: number | null
  action: string
  entity_type: string
  entity_id: number | null
  old_values: string | null
  new_values: string | null
  metadata: string | null
  created_at: Generated<string>
}

export interface TcSettingsTable {
  id: Generated<number>
  setting_key: string
  setting_value: string
  updated_by: number | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcFrontendReleasesTable {
  id: Generated<number>
  uuid: string
  channel: string
  name: string
  version: number
  payload: string
  checksum: string
  status: string
  created_by: number | null
  published_by: number | null
  published_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcFrontendPagesTable {
  id: Generated<number>
  uuid: string
  page_key: string
  route: string
  title: string
  status: string
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcFrontendSectionsTable {
  id: Generated<number>
  uuid: string
  page_id: number
  section_key: string
  section_type: string
  title: string | null
  eyebrow: string | null
  body: string | null
  settings: string | null
  sort_order: number
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface TcFrontendSectionItemsTable {
  id: Generated<number>
  uuid: string
  section_id: number
  item_key: string
  eyebrow: string | null
  title: string
  summary: string | null
  body: string | null
  image_url: string | null
  target_url: string | null
  content: string | null
  sort_order: number
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface DatabaseSchema {
  db_versions: DbVersionsTable
  site_pages: SitePagesTable
  site_services: SiteServicesTable
  site_posts: SitePostsTable
  site_messages: SiteMessagesTable
  industries: IndustriesTable
  tenants: TenantsTable
  tenant_domains: TenantDomainsTable
  admin_users: AdminUsersTable
  rbac_policies: RbacPoliciesTable
  tenant_rbac_policies: TenantRbacPoliciesTable
  queue_jobs: QueueJobsTable
  queue_runtime_settings: QueueRuntimeSettingsTable
  gst_provider_global_settings: GstProviderGlobalSettingsTable
  conversations: ConversationsTable
  agent_logs: AgentLogsTable
  knowledge_documents: KnowledgeDocumentsTable
  agent_provider_connections: AgentProviderConnectionsTable
  zetro_query_tools: ZetroQueryToolsTable
  zetro_query_mappings: ZetroQueryMappingsTable
  zetro_query_logs: ZetroQueryLogsTable
  subscription_apps: SubscriptionAppsTable
  subscription_plans: SubscriptionPlansTable
  subscription_plan_apps: SubscriptionPlanAppsTable
  tenant_subscriptions: TenantSubscriptionsTable
  tenant_subscription_apps: TenantSubscriptionAppsTable
  subscription_payments: SubscriptionPaymentsTable
  tc_accounts: TcAccountsTable
  tc_companies: TcCompaniesTable
  tc_categories: TcCategoriesTable
  tc_company_categories: TcCompanyCategoriesTable
  tc_products: TcProductsTable
  tc_submissions: TcSubmissionsTable
  tc_submission_revisions: TcSubmissionRevisionsTable
  tc_sync_requests: TcSyncRequestsTable
  tc_rfqs: TcRfqsTable
  tc_rfq_quotes: TcRfqQuotesTable
  tc_inquiries: TcInquiriesTable
  tc_verification_requests: TcVerificationRequestsTable
  tc_membership_plans: TcMembershipPlansTable
  tc_memberships: TcMembershipsTable
  tc_payments: TcPaymentsTable
  tc_content: TcContentTable
  tc_frontend_releases: TcFrontendReleasesTable
  tc_frontend_pages: TcFrontendPagesTable
  tc_frontend_sections: TcFrontendSectionsTable
  tc_frontend_section_items: TcFrontendSectionItemsTable
  tc_audit_logs: TcAuditLogsTable
  tc_settings: TcSettingsTable
}
