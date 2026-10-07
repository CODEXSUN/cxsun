import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactProfilesDatabase } from "./contact-profiles.types.js";

export const contactProfilesMigrationBatch: MigrationBatch<ContactProfilesDatabase> = {
  batch: 1,
  scope: "crm.contact-profiles",
  version: "1.0.80",
  description: "Contact 360 contact-profiles.",
  steps: [
    {
      checksum: "crm.contact-profiles.v1:v1",
      name: "crm.contact-profiles.v1",
      description: "Create contact_profiles.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_profiles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      core_contact_id INT NOT NULL,
      display_name VARCHAR(191) NULL,
      customer_kind VARCHAR(191) NULL,
      industry_id INT NULL,
      business_type VARCHAR(191) NULL,
      customer_since DATE NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY contact_profiles_core_contact_id_unique (core_contact_id),
      CONSTRAINT contact_profiles_core_contact_id_fk FOREIGN KEY (core_contact_id) REFERENCES core_contacts (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactProfiles = (database: Kysely<ContactProfilesDatabase>) =>
  runMigrationBatch(database, contactProfilesMigrationBatch);
