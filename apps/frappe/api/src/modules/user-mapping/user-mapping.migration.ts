import { sql, type Kysely } from "kysely";
import type { FrappeUserMappingDatabase } from "./user-mapping.types.js";

export const frappeUserMappingMigrations = [
  {
    name: "frappe.user-mapping.v1",
    description: "Link local tenant users to verified Frappe users at the configured site."
  }
];

export async function migrateFrappeUserMappingDatabase(
  database: Kysely<FrappeUserMappingDatabase>
) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_user_mappings (
    local_user_id INT NOT NULL PRIMARY KEY,
    frappe_user_id VARCHAR(191) NOT NULL,
    frappe_email VARCHAR(180) NOT NULL,
    employee_code VARCHAR(191) NULL,
    connection_hash CHAR(64) NOT NULL,
    verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY frappe_user_mapping_remote (connection_hash, frappe_user_id),
    CONSTRAINT frappe_user_mapping_local_fk FOREIGN KEY (local_user_id)
      REFERENCES app_users (id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

export async function rollbackFrappeUserMappingDatabase(
  database: Kysely<FrappeUserMappingDatabase>
) {
  await sql.raw("DROP TABLE IF EXISTS frappe_user_mappings").execute(database);
}
