import { sql, type Kysely } from "kysely";
import {
  runMigrationBatch,
  rollbackMigrationBatch,
  type MigrationBatch
} from "@cxsun/framework/db";
import type { AuditorClientDatabase } from "./client.types.js";

async function migrateClientModule(database: Kysely<AuditorClientDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS auditor_clients (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    name VARCHAR(191) NOT NULL,
    company_name VARCHAR(191) NULL,
    owner_name VARCHAR(191) NULL,
    mobile VARCHAR(80) NULL,
    email VARCHAR(191) NULL,
    gstin VARCHAR(15) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX auditor_clients_name (name),
    INDEX auditor_clients_status_name (status, name)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

async function addClientDetails(database: Kysely<AuditorClientDatabase>) {
  const result = await sql<{ column_name: string }>`
    SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auditor_clients'
  `.execute(database);
  const columns = new Set(result.rows.map((row) => row.column_name));
  for (const [name, definition] of [
    ["company_name", "VARCHAR(191) NULL"],
    ["owner_name", "VARCHAR(191) NULL"],
    ["mobile", "VARCHAR(80) NULL"],
    ["gstin", "VARCHAR(15) NULL"]
  ] as const) {
    if (!columns.has(name)) {
      await sql
        .raw(`ALTER TABLE auditor_clients ADD COLUMN ${name} ${definition}`)
        .execute(database);
    }
  }
  if (columns.has("phone")) {
    await sql`UPDATE auditor_clients SET mobile=phone WHERE mobile IS NULL AND phone IS NOT NULL`.execute(
      database
    );
  }
}

async function migrateClientCredentials(database: Kysely<AuditorClientDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS auditor_client_credentials (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    client_id INT NOT NULL,
    portal VARCHAR(24) NOT NULL,
    username VARCHAR(191) NOT NULL,
    password_secret TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY auditor_client_credentials_portal (client_id, portal),
    CONSTRAINT auditor_client_credentials_client_fk FOREIGN KEY (client_id)
      REFERENCES auditor_clients(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

const batch: MigrationBatch<AuditorClientDatabase> = {
  batch: 1,
  description: "Auditor office client directory.",
  scope: "auditor",
  version: "1.0.80",
  steps: [
    {
      checksum: "auditor.client.database-v1:v1",
      description: "Create auditor clients.",
      name: "auditor.client.database-v1",
      up: migrateClientModule,
      version: 1
    },
    {
      checksum: "auditor.client.details-v2:v1",
      description: "Add company, owner, mobile, and GSTIN details.",
      name: "auditor.client.details-v2",
      up: addClientDetails,
      version: 2
    },
    {
      checksum: "auditor.client.credentials-v3:v1",
      description: "Create encrypted per-client portal credentials.",
      name: "auditor.client.credentials-v3",
      up: migrateClientCredentials,
      version: 3
    }
  ]
};

export const auditorMigrations = batch.steps.map(({ description, name }) => ({
  description,
  name
}));
export const migrateAuditorDatabase = (database: Kysely<AuditorClientDatabase>) =>
  runMigrationBatch(database, batch);
export const rollbackAuditorDatabase = (database: Kysely<AuditorClientDatabase>) =>
  rollbackMigrationBatch(database, batch);
