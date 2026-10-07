import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactLifecycleDatabase } from "./contact-lifecycle.types.js";

export const contactLifecycleMigrationBatch: MigrationBatch<ContactLifecycleDatabase> = {
  batch: 1,
  scope: "crm.contact-lifecycle",
  version: "1.0.80",
  description: "Contact 360 contact-lifecycle.",
  steps: [
    {
      checksum: "crm.contact-lifecycle.v1:v1",
      name: "crm.contact-lifecycle.v1",
      description: "Create contact_lifecycle.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_lifecycle (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      previous_status VARCHAR(191) NULL,
      new_status VARCHAR(191) NOT NULL,
      reason TEXT NULL,
      effective_at DATE NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_lifecycle_person_id_idx (person_id),
      CONSTRAINT contact_lifecycle_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactLifecycle = (database: Kysely<ContactLifecycleDatabase>) =>
  runMigrationBatch(database, contactLifecycleMigrationBatch);
