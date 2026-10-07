import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactEmploymentsDatabase } from "./contact-employments.types.js";

export const contactEmploymentsMigrationBatch: MigrationBatch<ContactEmploymentsDatabase> = {
  batch: 1,
  scope: "crm.contact-employments",
  version: "1.0.80",
  description: "Contact 360 contact-employments.",
  steps: [
    {
      checksum: "crm.contact-employments.v1:v1",
      name: "crm.contact-employments.v1",
      description: "Create contact_employments.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_employments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      job_title VARCHAR(191) NULL,
      department VARCHAR(191) NULL,
      seniority VARCHAR(191) NULL,
      work_location VARCHAR(191) NULL,
      employment_status VARCHAR(191) NULL,
      joining_date DATE NULL,
      end_date DATE NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_employments_person_id_idx (person_id),
      CONSTRAINT contact_employments_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactEmployments = (database: Kysely<ContactEmploymentsDatabase>) =>
  runMigrationBatch(database, contactEmploymentsMigrationBatch);
