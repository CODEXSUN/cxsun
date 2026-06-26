import { sql } from 'kysely'
import { nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../infrastructure/database/database-module.js'
import { generatePublicUuid } from '../../shared/helpers/public-uuid.js'

const defaultApps = [
  ['application', 'Application', 'Company setup, users, roles, landing desk, and shared workspace controls.', 'Company, users, roles, default company, landing desk.', 0],
  ['billing', 'Billing', 'Sales, purchase, receipts, payments, GST reports, masters, and document settings.', 'Quotation, sales, purchase, receipts, payments, statements, GST, masters.', 149900],
  ['accounts', 'Accounts', 'Cash book, bank book, chart of accounts, vouchers, and financial reports.', 'Cash/bank books, ledgers, vouchers, trial balance, P&L, balance sheet.', 99900],
  ['inventory', 'Inventory', 'Stock receipts, delivery notes, stock ledger, product masters, and warehouse setup.', 'Purchase receipt, delivery note, stock ledger, product/common setup.', 129900],
  ['crm', 'CRM', 'Lead, deal, pipeline, people, campaign, activity, and CRM reporting desk.', 'Leads, deals, pipeline, contacts, campaigns, reports.', 99900],
  ['ecommerce', 'Ecommerce', 'Storefront operations, catalog, checkout, fulfillment, customers, and marketing.', 'Orders, checkout, products, customers, shipping, coupons, reports.', 199900],
  ['sites', 'Sites', 'Public sites, pages, sliders, media, forms, domains, campaigns, and analytics.', 'Pages, sliders, posts, domains, forms, SEO, analytics.', 99900],
  ['blog', 'Blog', 'Blog posts, categories, tags, comments, images, SEO, and publishing settings.', 'Posts, categories, tags, comments, image library, SEO.', 49900],
  ['media', 'Media', 'Central media library, uploads, sharing, and cross-module file links.', 'Uploads, folders, public/private files, sharing links.', 49900],
  ['mail', 'Mail', 'Workspace SMTP settings, compose desk, inbox folders, queued delivery, and history.', 'Compose, inbox, drafts, scheduled, sent, contacts, SMTP settings.', 79900],
  ['taskmanager', 'Task Manager', 'Task assignment, reminders, campaigns, templates, tags, and performance tracking.', 'My tasks, assigned tasks, campaigns, reminders, templates, performance.', 89900],
  ['auditor', 'Auditor', 'Auditor office contacts, credentials, GST filing tracker, and compliance follow-up.', 'Contacts, contact details, credentials, GST filing tracker.', 99900],
  ['tally', 'Tally', 'Tally handshake, master sync, entry sync, sync jobs, and integration desk.', 'Handshake, contacts/products sync, sales/purchase sync, jobs.', 79900],
  ['frappe', 'Frappe', 'Frappe handshake, DocType workbench, sync jobs, and integration activity.', 'Handshake, desk, settings, sync jobs.', 79900],
  ['tconnect', 'TConnect', 'Trade connection desk for supplier profiles, products, RFQs, leads, and membership.', 'Supplier profile, products, RFQs, leads, messages, membership, analytics.', 149900],
  ['agent-os', 'ZETRO', 'Universal AI helper base for knowledge, safe tools, workflows, analytics, and memory.', 'Helper chat, knowledge, providers, agents, query mapping, updates.', 0],
] as const

const defaultPlans = [
  {
    key: 'starter',
    name: 'Starter',
    summary: 'Lean operating plan for billing-first workspaces.',
    price: 249900,
    apps: ['billing', 'accounts', 'media', 'mail'],
  },
  {
    key: 'business',
    name: 'Business',
    summary: 'Full SME operations plan with billing, accounts, stock, CRM, and task workflows.',
    price: 499900,
    apps: ['billing', 'accounts', 'inventory', 'crm', 'media', 'mail', 'taskmanager', 'sites', 'blog'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    summary: 'Complete Odoo-style app suite with integrations, ecommerce, trade, and AI workspace.',
    price: 999900,
    apps: defaultApps.map(([key]) => key).filter((key) => key !== 'application'),
  },
]

export const subscriptionDatabaseModule: PlatformDatabaseModule = {
  name: 'subscription',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS subscription_apps (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        app_key VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        summary TEXT NOT NULL,
        feature_summary TEXT NOT NULL,
        base_price_paise INT NOT NULL DEFAULT 0,
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 0,
        metadata LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        plan_key VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        summary TEXT NOT NULL,
        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        base_price_paise INT NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 0,
        metadata LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS subscription_plan_apps (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        app_id INT NOT NULL,
        price_override_paise INT NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_subscription_plan_app (plan_id, app_id),
        CONSTRAINT fk_subscription_plan_apps_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
        CONSTRAINT fk_subscription_plan_apps_app FOREIGN KEY (app_id) REFERENCES subscription_apps(id)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NOT NULL,
        plan_id INT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        amount_paise INT NOT NULL DEFAULT 0,
        started_at DATETIME NULL,
        current_period_start DATETIME NULL,
        current_period_end DATETIME NULL,
        cancelled_at DATETIME NULL,
        razorpay_customer_id VARCHAR(191) NULL,
        razorpay_subscription_id VARCHAR(191) NULL,
        metadata LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_subscriptions_tenant (tenant_id, status),
        CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        CONSTRAINT fk_tenant_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_subscription_apps (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        app_id INT NOT NULL,
        app_key VARCHAR(80) NOT NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        unit_price_paise INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tenant_subscription_app (subscription_id, app_id),
        INDEX idx_tenant_subscription_app_key (app_key, is_enabled),
        CONSTRAINT fk_tenant_subscription_apps_subscription FOREIGN KEY (subscription_id) REFERENCES tenant_subscriptions(id),
        CONSTRAINT fk_tenant_subscription_apps_app FOREIGN KEY (app_id) REFERENCES subscription_apps(id)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NOT NULL,
        subscription_id INT NULL,
        amount_paise INT NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'created',
        provider VARCHAR(40) NOT NULL DEFAULT 'razorpay',
        provider_order_id VARCHAR(191) NULL,
        provider_payment_id VARCHAR(191) NULL,
        provider_signature VARCHAR(255) NULL,
        receipt VARCHAR(120) NULL,
        payload LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_subscription_payments_tenant (tenant_id, status),
        INDEX idx_subscription_payments_provider_order (provider_order_id),
        CONSTRAINT fk_subscription_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        CONSTRAINT fk_subscription_payments_subscription FOREIGN KEY (subscription_id) REFERENCES tenant_subscriptions(id)
      )
    `).execute(database)
  },
  async seed(database) {
    await seedSubscriptionApps(database)
    await seedSubscriptionPlans(database)
  },
}

async function seedSubscriptionApps(database: PlatformDatabase) {
  const now = nowIso()
  for (let index = 0; index < defaultApps.length; index += 1) {
    const [appKey, name, summary, featureSummary, basePrice] = defaultApps[index]
    const existing = await database.selectFrom('subscription_apps').select('id').where('app_key', '=', appKey).executeTakeFirst()
    const values = {
      name,
      summary,
      feature_summary: featureSummary,
      base_price_paise: basePrice,
      currency: 'INR',
      status: 'active',
      sort_order: index + 1,
      updated_at: now,
    }

    if (existing) {
      await database.updateTable('subscription_apps').set(values).where('id', '=', existing.id).execute()
      continue
    }

    await database.insertInto('subscription_apps').values({ ...values, uuid: generatePublicUuid(), app_key: appKey }).execute()
  }
}

async function seedSubscriptionPlans(database: PlatformDatabase) {
  const now = nowIso()
  for (let index = 0; index < defaultPlans.length; index += 1) {
    const plan = defaultPlans[index]
    const existing = await database.selectFrom('subscription_plans').select('id').where('plan_key', '=', plan.key).executeTakeFirst()
    const values = {
      name: plan.name,
      summary: plan.summary,
      billing_cycle: 'monthly',
      currency: 'INR',
      base_price_paise: plan.price,
      status: 'active',
      sort_order: index + 1,
      updated_at: now,
    }
    const planId = existing?.id ?? Number((await database.insertInto('subscription_plans').values({ ...values, uuid: generatePublicUuid(), plan_key: plan.key }).executeTakeFirst()).insertId)
    if (existing) {
      await database.updateTable('subscription_plans').set(values).where('id', '=', existing.id).execute()
    }

    await syncPlanApps(database, planId, plan.apps)
  }
}

async function syncPlanApps(database: PlatformDatabase, planId: number, appKeys: readonly string[]) {
  const now = nowIso()
  const apps = await database.selectFrom('subscription_apps').select(['id', 'app_key']).where('app_key', 'in', [...appKeys]).execute()
  for (const app of apps) {
    const existing = await database
      .selectFrom('subscription_plan_apps')
      .select('id')
      .where('plan_id', '=', planId)
      .where('app_id', '=', app.id)
      .executeTakeFirst()

    if (existing) {
      await database.updateTable('subscription_plan_apps').set({ is_enabled: 1, updated_at: now }).where('id', '=', existing.id).execute()
      continue
    }

    await database.insertInto('subscription_plan_apps').values({ plan_id: planId, app_id: app.id, is_enabled: 1, updated_at: now }).execute()
  }
}
