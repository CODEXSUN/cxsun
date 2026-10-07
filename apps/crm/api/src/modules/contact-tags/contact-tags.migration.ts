import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactTagsDatabase } from "./contact-tags.types.js";

export const contactTagsMigrationBatch: MigrationBatch<ContactTagsDatabase> = {
  batch: 1,
  scope: "crm.contact-tags",
  version: "1.0.80",
  description: "Contact 360 contact-tags.",
  steps: [
    {
      checksum: "crm.contact-tags.v1:v1",
      name: "crm.contact-tags.v1",
      description: "Create contact_tags.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      name VARCHAR(191) NOT NULL,
      color VARCHAR(32) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY contact_tags_name_unique (name)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactTags = (database: Kysely<ContactTagsDatabase>) =>
  runMigrationBatch(database, contactTagsMigrationBatch);
