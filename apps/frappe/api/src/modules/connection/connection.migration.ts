import { sql, type Kysely } from "kysely";
import type { FrappeDatabase } from "./connection.types.js";

export const frappeTenantMigrations = [
  {
    name: "frappe.enquiry-sync.v1",
    description: "Store outbound Frappe document identities for local CRM enquiries."
  },
  {
    name: "frappe.connection-settings.v1",
    description: "Store tenant Frappe connection settings with encrypted credentials."
  }
];

export async function migrateFrappeTenantDatabase(database: Kysely<FrappeDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_connection_settings (
    id INT NOT NULL PRIMARY KEY,
    connection_name VARCHAR(191) NOT NULL,
    base_url VARCHAR(2048) NOT NULL,
    api_key_ciphertext TEXT NULL,
    api_secret_ciphertext TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status ENUM('unverified','verified','failed') NOT NULL DEFAULT 'unverified',
    last_checked_at DATETIME NULL,
    last_verified_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_enquiry_sync (
    enquiry_id INT NOT NULL PRIMARY KEY,
    remote_name VARCHAR(191) NOT NULL,
    synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY frappe_enquiry_sync_remote (remote_name),
    CONSTRAINT frappe_enquiry_sync_enquiry_fk FOREIGN KEY (enquiry_id)
      REFERENCES crm_enquiries (id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

export async function rollbackFrappeTenantDatabase(database: Kysely<FrappeDatabase>) {
  await sql.raw("DROP TABLE IF EXISTS frappe_enquiry_sync").execute(database);
  await sql.raw("DROP TABLE IF EXISTS frappe_connection_settings").execute(database);
}
