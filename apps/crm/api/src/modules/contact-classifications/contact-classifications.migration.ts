import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactClassificationsDatabase } from "./contact-classifications.types.js";

export const contactClassificationsMigrationBatch: MigrationBatch<ContactClassificationsDatabase> =
  {
    batch: 1,
    scope: "crm.contact-classifications",
    version: "1.0.80",
    description: "Contact 360 contact-classifications.",
    steps: [
      {
        checksum: "crm.contact-classifications.v1:v1",
        name: "crm.contact-classifications.v1",
        description: "Create contact_classifications.",
        version: 1,
        up: async (database) => {
          await sql
            .raw(
              `CREATE TABLE IF NOT EXISTS contact_classifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      category VARCHAR(191) NULL,
      priority_level VARCHAR(191) NULL,
      is_vip TINYINT(1) NOT NULL DEFAULT 0,
      is_primary_contact TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY contact_classifications_person_id_unique (person_id),
      CONSTRAINT contact_classifications_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            )
            .execute(database);
        }
      }
    ]
  };

export const migrateContactClassifications = (database: Kysely<ContactClassificationsDatabase>) =>
  runMigrationBatch(database, contactClassificationsMigrationBatch);
