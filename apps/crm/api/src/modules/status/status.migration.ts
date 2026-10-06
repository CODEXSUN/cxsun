import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { StatusDatabase } from "./status.types.js";

export const statusMigrationBatch: MigrationBatch<StatusDatabase> = {
  batch: 1,
  description: "CRM Status master.",
  scope: "crm.status",
  version: "1.0.80",
  steps: [
    {
      checksum: "crm.status.master-v1:v1",
      description: "Create CRM Status master.",
      name: "crm.status.master-v1",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS crm_enquiry_statuses (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(120) NOT NULL,
        UNIQUE KEY crm_enquiry_statuses_code_unique (code),
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 1000,
        created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
        updated_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY crm_enquiry_statuses_name_unique (name),
        INDEX crm_enquiry_statuses_status_sort (status, sort_order)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};
export const migrateStatusMaster = (database: Kysely<StatusDatabase>) =>
  runMigrationBatch(database, statusMigrationBatch);
