import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactPreferencesDatabase } from "./contact-preferences.types.js";

export const contactPreferencesMigrationBatch: MigrationBatch<ContactPreferencesDatabase> = {
  batch: 1,
  scope: "crm.contact-preferences",
  version: "1.0.80",
  description: "Contact 360 contact-preferences.",
  steps: [
    {
      checksum: "crm.contact-preferences.v1:v1",
      name: "crm.contact-preferences.v1",
      description: "Create contact_preferences.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_preferences (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      preferred_channel VARCHAR(191) NULL,
      preferred_language VARCHAR(191) NULL,
      preferred_time VARCHAR(191) NULL,
      communication_frequency VARCHAR(191) NULL,
      communication_permission VARCHAR(191) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY contact_preferences_person_id_unique (person_id),
      CONSTRAINT contact_preferences_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactPreferences = (database: Kysely<ContactPreferencesDatabase>) =>
  runMigrationBatch(database, contactPreferencesMigrationBatch);
