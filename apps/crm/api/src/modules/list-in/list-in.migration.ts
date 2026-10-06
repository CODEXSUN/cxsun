import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ListInDatabase } from "./list-in.types.js";

export const listinMigrationBatch: MigrationBatch<ListInDatabase> = {
  batch: 1,
  description: "CRM ListIn master.",
  scope: "crm.list-in",
  version: "1.0.80",
  steps: [
    {
      checksum: "crm.list-in.master-v1:v1",
      description: "Create CRM ListIn master.",
      name: "crm.list-in.master-v1",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS crm_enquiry_lists (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
        name VARCHAR(120) NOT NULL,

        status VARCHAR(24) NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 1000,
        created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
        updated_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY crm_enquiry_lists_name_unique (name),
        INDEX crm_enquiry_lists_status_sort (status, sort_order)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};
export const migrateListInMaster = (database: Kysely<ListInDatabase>) =>
  runMigrationBatch(database, listinMigrationBatch);
