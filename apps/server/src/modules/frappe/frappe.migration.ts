import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateFrappeTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS frappe_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      base_url VARCHAR(240) NOT NULL DEFAULT 'http://localhost:8000',
      site_name VARCHAR(191) NULL,
      api_key VARCHAR(240) NULL,
      api_secret VARCHAR(320) NULL,
      default_company VARCHAR(220) NULL,
      default_warehouse VARCHAR(220) NULL,
      timeout_seconds INT NOT NULL DEFAULT 30,
      sync_contacts TINYINT(1) NOT NULL DEFAULT 1,
      sync_products TINYINT(1) NOT NULL DEFAULT 1,
      sync_sales TINYINT(1) NOT NULL DEFAULT 1,
      sync_purchase TINYINT(1) NOT NULL DEFAULT 1,
      settings JSON NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_frappe_settings_tenant_company (tenant_id, company_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS frappe_sync_jobs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      job_type VARCHAR(80) NOT NULL,
      direction VARCHAR(40) NOT NULL DEFAULT 'export',
      status VARCHAR(40) NOT NULL DEFAULT 'queued',
      requested_by VARCHAR(191) NOT NULL,
      started_at DATETIME NULL,
      finished_at DATETIME NULL,
      total_records INT NOT NULL DEFAULT 0,
      success_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      payload JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_frappe_jobs_tenant (tenant_id, status, created_at),
      INDEX idx_frappe_jobs_type (tenant_id, job_type, direction)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS frappe_record_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      doctype VARCHAR(120) NOT NULL,
      local_module VARCHAR(120) NULL,
      local_record_uuid VARCHAR(80) NULL,
      remote_name VARCHAR(220) NULL,
      record_label VARCHAR(240) NULL,
      direction VARCHAR(40) NOT NULL DEFAULT 'import',
      status VARCHAR(40) NOT NULL DEFAULT 'not-synced',
      last_synced_at DATETIME NULL,
      last_error TEXT NULL,
      payload JSON NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_frappe_record_links_status (tenant_id, doctype, status, updated_at),
      INDEX idx_frappe_record_links_remote (tenant_id, doctype, remote_name)
    )
  `).execute(database)
}
