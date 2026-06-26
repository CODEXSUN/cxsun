import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migratePaymentEntryTables(database: TenantDatabase) {
  await sql`
    CREATE TABLE IF NOT EXISTS payment_entries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      payment_no VARCHAR(80) NOT NULL,
      payment_date DATE NOT NULL,
      party_id VARCHAR(120) NULL,
      party_name VARCHAR(220) NOT NULL,
      party_type VARCHAR(80) NULL,
      ledger_id VARCHAR(120) NULL,
      ledger_name VARCHAR(180) NULL,
      payment_mode VARCHAR(80) NOT NULL,
      bank_account_id VARCHAR(120) NULL,
      reference_no VARCHAR(120) NULL,
      reference_date DATE NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      tds_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      round_off DECIMAL(15, 2) NOT NULL DEFAULT 0,
      net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      allocated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      unallocated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      notes TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_payment_entries_context_no (tenant_id, company_id, accounting_year_id, payment_no),
      INDEX idx_payment_entries_tenant_date (tenant_id, payment_date, id),
      INDEX idx_payment_entries_company_year (company_id, accounting_year_id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS payment_entry_allocations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_entry_id BIGINT UNSIGNED NOT NULL,
      document_type VARCHAR(80) NOT NULL,
      document_id VARCHAR(120) NULL,
      document_no VARCHAR(120) NOT NULL,
      document_date DATE NULL,
      document_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
      previous_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
      allocated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      balance_after_allocation DECIMAL(15, 2) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_allocations_entry (payment_entry_id, sort_order)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS payment_entry_comments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_entry_id BIGINT UNSIGNED NOT NULL,
      uuid VARCHAR(80) NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_comments_entry (payment_entry_id, id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS payment_entry_activities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_entry_id BIGINT UNSIGNED NOT NULL,
      uuid VARCHAR(80) NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(255) NOT NULL,
      payload JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_activities_entry (payment_entry_id, id)
    )
  `.execute(database)
}
