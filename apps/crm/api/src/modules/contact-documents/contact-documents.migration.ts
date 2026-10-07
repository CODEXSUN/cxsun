import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactDocumentsDatabase } from "./contact-documents.types.js";

export const contactDocumentsMigrationBatch: MigrationBatch<ContactDocumentsDatabase> = {
  batch: 1,
  scope: "crm.contact-documents",
  version: "1.0.80",
  description: "Contact 360 contact-documents.",
  steps: [
    {
      checksum: "crm.contact-documents.v1:v1",
      name: "crm.contact-documents.v1",
      description: "Create contact_documents.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_documents (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      document_type VARCHAR(191) NULL,
      document_name VARCHAR(191) NOT NULL,
      description TEXT NULL,
      document_date DATE NULL,
      expiry_date DATE NULL,
      file_ref VARCHAR(255) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_documents_person_id_idx (person_id),
      CONSTRAINT contact_documents_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactDocuments = (database: Kysely<ContactDocumentsDatabase>) =>
  runMigrationBatch(database, contactDocumentsMigrationBatch);
