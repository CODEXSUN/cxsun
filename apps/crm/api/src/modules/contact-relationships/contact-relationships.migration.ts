import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactRelationshipsDatabase } from "./contact-relationships.types.js";

export const contactRelationshipsMigrationBatch: MigrationBatch<ContactRelationshipsDatabase> = {
  batch: 1,
  scope: "crm.contact-relationships",
  version: "1.0.80",
  description: "Contact 360 contact-relationships.",
  steps: [
    {
      checksum: "crm.contact-relationships.v1:v1",
      name: "crm.contact-relationships.v1",
      description: "Create contact_relationships.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_relationships (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      customer_contact_id INT NOT NULL,
      person_a_id INT NOT NULL,
      person_b_id INT NOT NULL,
      relationship_type VARCHAR(191) NOT NULL,
      relationship_strength VARCHAR(191) NULL,
      notes TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_relationships_customer_contact_id_idx (customer_contact_id),
      CONSTRAINT contact_relationships_customer_contact_id_fk FOREIGN KEY (customer_contact_id) REFERENCES core_contacts (id) ON DELETE RESTRICT,
      CONSTRAINT contact_relationships_person_a_id_fk FOREIGN KEY (person_a_id) REFERENCES contact_people (id) ON DELETE RESTRICT,
      CONSTRAINT contact_relationships_person_b_id_fk FOREIGN KEY (person_b_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactRelationships = (database: Kysely<ContactRelationshipsDatabase>) =>
  runMigrationBatch(database, contactRelationshipsMigrationBatch);
