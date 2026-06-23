import mysql from "mysql2/promise"
import type { Pool } from "mysql2/promise"
import { loadCxSyncEnvironment } from "./environment.js"

let poolPromise: Promise<Pool> | null = null

export async function getCxSyncDatabase() {
  if (!poolPromise) poolPromise = createCxSyncDatabase()
  return poolPromise
}

export async function getCxSyncDatabaseInfo() {
  const env = await loadCxSyncEnvironment()
  return {
    database: databaseName(env.CXSYNC_DB_NAME || "cxsync_admin"),
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
  }
}

async function createCxSyncDatabase() {
  const env = await loadCxSyncEnvironment()
  const config = {
    host: env.DB_HOST || "127.0.0.1",
    password: env.DB_PASSWORD || "",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
  }
  const database = databaseName(env.CXSYNC_DB_NAME || "cxsync_admin")
  const root = await mysql.createConnection({ ...config, connectTimeout: 8_000 })
  try {
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await root.end()
  }

  const pool = mysql.createPool({
    ...config,
    connectionLimit: 6,
    database,
    dateStrings: true,
    enableKeepAlive: true,
  })
  await migrate(pool)
  return pool
}

async function migrate(database: Pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_config (
      config_key VARCHAR(120) PRIMARY KEY,
      value_json LONGTEXT NOT NULL,
      updated_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_tenant_connections (
      id CHAR(36) PRIMARY KEY,
      tenant_name VARCHAR(191) NOT NULL,
      tenant_code VARCHAR(120) NOT NULL,
      corporate_id VARCHAR(120) NOT NULL,
      local_host VARCHAR(191) NOT NULL,
      local_port INT NOT NULL,
      local_database VARCHAR(191) NOT NULL,
      local_user VARCHAR(191) NOT NULL,
      encrypted_local_password TEXT NOT NULL,
      cloud_api_url VARCHAR(500) NOT NULL,
      cloud_domain VARCHAR(255) NOT NULL,
      cloud_admin_email VARCHAR(255) NOT NULL,
      encrypted_cloud_password TEXT NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY uq_cxsync_tenant_code (tenant_code)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_handshake_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      verified_at DATETIME(3) NOT NULL,
      local_ok TINYINT(1) NOT NULL,
      local_database VARCHAR(191) NOT NULL,
      local_latency_ms INT NOT NULL,
      local_message TEXT NOT NULL,
      local_version VARCHAR(80) NOT NULL,
      cloud_ok TINYINT(1) NOT NULL,
      cloud_latency_ms INT NOT NULL,
      cloud_message TEXT NOT NULL,
      cloud_version VARCHAR(80) NOT NULL,
      versions_match TINYINT(1) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_handshake_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_handshake_latest (tenant_connection_id, verified_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_analytics_snapshots (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tenant_connection_id CHAR(36) NULL,
      metric_key VARCHAR(160) NOT NULL,
      metric_value DECIMAL(24,6) NULL,
      payload_json LONGTEXT NULL,
      captured_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_analytics_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_analytics_metric (metric_key, captured_at),
      KEY idx_cxsync_analytics_tenant (tenant_connection_id, captured_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_data_snapshots (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      snapshot_type VARCHAR(120) NOT NULL,
      source_version VARCHAR(80) NULL,
      status VARCHAR(40) NOT NULL,
      row_count BIGINT NOT NULL DEFAULT 0,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      manifest_json LONGTEXT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_snapshot_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_snapshot_tenant (tenant_connection_id, created_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_schema_baselines (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      baseline_name VARCHAR(191) NOT NULL,
      source VARCHAR(40) NOT NULL,
      schema_hash VARCHAR(128) NOT NULL,
      manifest_json LONGTEXT NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_schema_baseline_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_schema_baseline_active (tenant_connection_id, is_active, created_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_upgrade_plans (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      baseline_id CHAR(36) NOT NULL,
      diff_snapshot_id CHAR(36) NOT NULL,
      status VARCHAR(40) NOT NULL,
      safe_step_count INT NOT NULL DEFAULT 0,
      caution_step_count INT NOT NULL DEFAULT 0,
      destructive_step_count INT NOT NULL DEFAULT 0,
      manifest_json LONGTEXT NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_upgrade_plan_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_upgrade_plan_latest (tenant_connection_id, created_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_upgrade_preflights (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      plan_id CHAR(36) NOT NULL,
      ready TINYINT(1) NOT NULL,
      passed_count INT NOT NULL DEFAULT 0,
      warning_count INT NOT NULL DEFAULT 0,
      blocked_count INT NOT NULL DEFAULT 0,
      report_json LONGTEXT NOT NULL,
      checked_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_preflight_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_preflight_latest (tenant_connection_id, checked_at)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_tenant_backups (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      plan_id CHAR(36) NOT NULL,
      database_name VARCHAR(191) NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      sha256 CHAR(64) NOT NULL,
      status VARCHAR(40) NOT NULL,
      restore_database VARCHAR(191) NULL,
      restore_verified_at DATETIME(3) NULL,
      schema_hash CHAR(64) NULL,
      baseline_hash CHAR(64) NULL,
      plan_hash CHAR(64) NULL,
      table_count INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      CONSTRAINT fk_cxsync_backup_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_backup_latest (tenant_connection_id, created_at)
    ) ENGINE=InnoDB
  `)
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS restore_database VARCHAR(191) NULL AFTER status")
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS restore_verified_at DATETIME(3) NULL AFTER restore_database")
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS schema_hash CHAR(64) NULL AFTER restore_verified_at")
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS baseline_hash CHAR(64) NULL AFTER schema_hash")
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS plan_hash CHAR(64) NULL AFTER baseline_hash")
  await database.query("ALTER TABLE cxsync_tenant_backups ADD COLUMN IF NOT EXISTS table_count INT NOT NULL DEFAULT 0 AFTER plan_hash")
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_upgrade_executions (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      plan_id CHAR(36) NOT NULL,
      preflight_id CHAR(36) NOT NULL,
      backup_id CHAR(36) NOT NULL,
      status VARCHAR(40) NOT NULL,
      applied_count INT NOT NULL DEFAULT 0,
      skipped_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      report_json LONGTEXT NOT NULL,
      started_at DATETIME(3) NOT NULL,
      completed_at DATETIME(3) NULL,
      CONSTRAINT fk_cxsync_execution_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_execution_latest (tenant_connection_id, started_at),
      KEY idx_cxsync_execution_plan (plan_id)
    ) ENGINE=InnoDB
  `)
  await database.query(`
    CREATE TABLE IF NOT EXISTS cxsync_sync_jobs (
      id CHAR(36) PRIMARY KEY,
      tenant_connection_id CHAR(36) NOT NULL,
      status VARCHAR(40) NOT NULL,
      current_phase VARCHAR(80) NOT NULL,
      report_json LONGTEXT NOT NULL,
      started_at DATETIME(3) NOT NULL,
      completed_at DATETIME(3) NULL,
      CONSTRAINT fk_cxsync_sync_job_tenant
        FOREIGN KEY (tenant_connection_id) REFERENCES cxsync_tenant_connections(id)
        ON DELETE CASCADE,
      KEY idx_cxsync_sync_job_latest (tenant_connection_id, started_at)
    ) ENGINE=InnoDB
  `)
}

function databaseName(value: string) {
  const normalized = value.trim()
  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) throw new Error("CXSYNC_DB_NAME may contain only letters, numbers, and underscores.")
  return normalized
}
