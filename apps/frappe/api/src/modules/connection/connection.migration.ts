import { sql, type Kysely } from "kysely";
import type { FrappeDatabase } from "./connection.types.js";

export const frappeTenantMigrations = [
  {
    name: "frappe.enquiry-sync.v1",
    description: "Store outbound Frappe document identities for local CRM enquiries."
  }
];

export async function migrateFrappeTenantDatabase(database: Kysely<FrappeDatabase>) {
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
}
