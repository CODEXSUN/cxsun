import { sql, type Kysely } from "kysely";
import { runMigrationBatch, type MigrationBatch } from "@cxsun/framework/db";
import type { ContactRolesDatabase } from "./contact-roles.types.js";

export const contactRolesMigrationBatch: MigrationBatch<ContactRolesDatabase> = {
  batch: 1,
  scope: "crm.contact-roles",
  version: "1.0.80",
  description: "Contact 360 contact-roles.",
  steps: [
    {
      checksum: "crm.contact-roles.v1:v1",
      name: "crm.contact-roles.v1",
      description: "Create contact_roles.",
      version: 1,
      up: async (database) => {
        await sql
          .raw(
            `CREATE TABLE IF NOT EXISTS contact_roles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      person_id INT NOT NULL,
      role_name VARCHAR(191) NOT NULL,
      is_primary_role TINYINT(1) NOT NULL DEFAULT 0,
      decision_authority VARCHAR(191) NULL,
      influence_level VARCHAR(191) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX contact_roles_person_id_idx (person_id),
      CONSTRAINT contact_roles_person_id_fk FOREIGN KEY (person_id) REFERENCES contact_people (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          )
          .execute(database);
      }
    }
  ]
};

export const migrateContactRoles = (database: Kysely<ContactRolesDatabase>) =>
  runMigrationBatch(database, contactRolesMigrationBatch);
