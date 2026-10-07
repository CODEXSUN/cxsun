import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactNotesDatabase } from "./contact-notes.types.js";

export const contactNotesMigrationBatch: MigrationBatch<ContactNotesDatabase> = {
  batch: 1,
  scope: "crm.contact-notes",
  version: "1.0.80",
  description: "Contact 360 contact-notes.",
  steps: [
    {
      checksum: "crm.contact-notes.v1:v1",
      name: "crm.contact-notes.v1",
      description: "Create contact_notes.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_notes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      note_type VARCHAR(191) NULL,
      body TEXT NOT NULL,
      is_important TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_notes_person_id_idx (person_id),
      CONSTRAINT contact_notes_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactNotes = (database: Kysely<ContactNotesDatabase>) =>
  runMigrationBatch(database, contactNotesMigrationBatch);
