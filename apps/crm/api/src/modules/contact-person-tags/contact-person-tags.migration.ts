import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactPersonTagsDatabase } from "./contact-person-tags.types.js";

export const contactPersonTagsMigrationBatch: MigrationBatch<ContactPersonTagsDatabase> = {
  batch: 1,
  scope: "crm.contact-person-tags",
  version: "1.0.80",
  description: "Contact 360 contact-person-tags.",
  steps: [
    {
      checksum: "crm.contact-person-tags.v1:v1",
      name: "crm.contact-person-tags.v1",
      description: "Create contact_person_tags.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_person_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      tag_id INT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY contact_person_tags_pair_unique (person_id, tag_id),
      INDEX contact_person_tags_person_id_idx (person_id),
      CONSTRAINT contact_person_tags_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT,
      CONSTRAINT contact_person_tags_tag_id_fk FOREIGN KEY (tag_id) REFERENCES contact_tags (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactPersonTags = (database: Kysely<ContactPersonTagsDatabase>) =>
  runMigrationBatch(database, contactPersonTagsMigrationBatch);
