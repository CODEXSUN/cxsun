import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactPeopleDatabase } from "./contact-people.types.js";

export const contactPeopleMigrationBatch: MigrationBatch<ContactPeopleDatabase> = {
  batch: 1,
  scope: "crm.contact-people",
  version: "1.0.80",
  description: "Contact 360 contact-people.",
  steps: [
    {
      checksum: "crm.contact-people.v1:v1",
      name: "crm.contact-people.v1",
      description: "Create contact_people.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_people (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      customer_contact_id INT NOT NULL,
      first_name VARCHAR(191) NOT NULL,
      last_name VARCHAR(191) NULL,
      display_name VARCHAR(191) NULL,
      salutation VARCHAR(191) NULL,
      profile_photo_ref VARCHAR(255) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_people_customer_contact_id_idx (customer_contact_id),
      CONSTRAINT contact_people_customer_contact_id_fk FOREIGN KEY (customer_contact_id) REFERENCES core_contacts (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactPeople = (database: Kysely<ContactPeopleDatabase>) =>
  runMigrationBatch(database, contactPeopleMigrationBatch);
