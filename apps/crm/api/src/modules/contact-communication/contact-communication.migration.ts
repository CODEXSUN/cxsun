import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactCommunicationDatabase } from "./contact-communication.types.js";

export const contactCommunicationMigrationBatch: MigrationBatch<ContactCommunicationDatabase> = {
  batch: 1,
  scope: "crm.contact-communication",
  version: "1.0.80",
  description: "Contact 360 contact-communication.",
  steps: [
    {
      checksum: "crm.contact-communication.v1:v1",
      name: "crm.contact-communication.v1",
      description: "Create contact_communication.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_communication (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      kind VARCHAR(32) NOT NULL,
      value VARCHAR(191) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      is_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_communication_person_id_idx (person_id),
      CONSTRAINT contact_communication_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactCommunication = (database: Kysely<ContactCommunicationDatabase>) =>
  runMigrationBatch(database, contactCommunicationMigrationBatch);
