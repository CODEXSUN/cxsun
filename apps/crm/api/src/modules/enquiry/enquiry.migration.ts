import { sql, type Kysely } from "kysely";
import {
  runMigrationBatch,
  rollbackMigrationBatch,
  type MigrationBatch
} from "@cxsun/framework/db";
import type { EnquiryDatabase } from "./enquiry.types.js";

export const enquiryMigration = {
  key: "crm.enquiry.database-v1",
  description: "CRM enquiries linked to Core contacts."
} as const;

export async function migrateEnquiryModule(database: Kysely<EnquiryDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiries (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    contact_id INT NULL,
    captured_name VARCHAR(191) NULL,
    captured_email VARCHAR(191) NULL,
    captured_phone VARCHAR(80) NULL,
    source VARCHAR(80) NOT NULL DEFAULT 'manual',
    source_reference VARCHAR(191) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'new',
    priority VARCHAR(24) NOT NULL DEFAULT 'normal',
    assigned_user_id INT NULL,
    enquired_at DATETIME NOT NULL,
    closed_reason TEXT NULL,
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiries_status_created (status, created_at),
    INDEX crm_enquiries_assigned_status (assigned_user_id, status),
    INDEX crm_enquiries_contact (contact_id),
    CONSTRAINT crm_enquiries_contact_fk FOREIGN KEY (contact_id) REFERENCES core_contacts (id) ON DELETE RESTRICT,
    CONSTRAINT crm_enquiries_assignee_fk FOREIGN KEY (assigned_user_id) REFERENCES app_users (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

async function addEnquiryScheduling(database: Kysely<EnquiryDatabase>) {
  const result = await sql<{ column_name: string }>`
    SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiries'
  `.execute(database);
  const columns = new Set(result.rows.map((row) => row.column_name));
  if (!columns.has("list_in")) {
    await sql
      .raw("ALTER TABLE crm_enquiries ADD COLUMN list_in VARCHAR(120) NULL")
      .execute(database);
  }
  if (!columns.has("due_date")) {
    await sql.raw("ALTER TABLE crm_enquiries ADD COLUMN due_date DATE NULL").execute(database);
  }
}

async function addEnquiryNumber(database: Kysely<EnquiryDatabase>) {
  const columns = await sql<{ column_name: string }>`
    SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiries' AND COLUMN_NAME='enquiry_no'
  `.execute(database);
  if (columns.rows.length === 0) {
    await sql.raw("ALTER TABLE crm_enquiries ADD COLUMN enquiry_no INT NULL").execute(database);
  }

  await sql`UPDATE crm_enquiries SET enquiry_no=id WHERE enquiry_no IS NULL`.execute(database);
  const indexes = await sql<{ index_name: string }>`
    SELECT INDEX_NAME AS index_name
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiries'
      AND INDEX_NAME='crm_enquiries_enquiry_no'
  `.execute(database);
  if (indexes.rows.length === 0) {
    await sql
      .raw("ALTER TABLE crm_enquiries ADD UNIQUE KEY crm_enquiries_enquiry_no (enquiry_no)")
      .execute(database);
  }
  await sql.raw("ALTER TABLE crm_enquiries MODIFY enquiry_no INT NOT NULL").execute(database);

  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_number_sequence (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      next_no INT NOT NULL,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql`
    INSERT INTO crm_enquiry_number_sequence (id, next_no)
    SELECT 1, COALESCE(MAX(enquiry_no), 0) + 1 FROM crm_enquiries
    ON DUPLICATE KEY UPDATE next_no=GREATEST(next_no, VALUES(next_no))
  `.execute(database);
}

async function addEnquiryNumberSequenceAudit(database: Kysely<EnquiryDatabase>) {
  const result = await sql<{ column_name: string; data_type: string; extra: string }>`
    SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, EXTRA AS extra
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiry_number_sequence'
  `.execute(database);
  const columns = new Map(result.rows.map((row) => [row.column_name, row]));
  const id = columns.get("id");
  if (id?.data_type !== "int" || !id.extra.includes("auto_increment")) {
    await sql
      .raw("ALTER TABLE crm_enquiry_number_sequence MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT")
      .execute(database);
  }
  for (const [column, definition] of [
    ["uuid", "CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE"],
    ["status", "VARCHAR(24) NOT NULL DEFAULT 'active'"],
    ["created_by", "VARCHAR(191) NOT NULL DEFAULT 'system:migration'"],
    ["created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"]
  ] as const) {
    if (!columns.has(column)) {
      await sql
        .raw(`ALTER TABLE crm_enquiry_number_sequence ADD COLUMN ${column} ${definition}`)
        .execute(database);
    }
  }
}

const batch: MigrationBatch<EnquiryDatabase> = {
  batch: 1,
  description: enquiryMigration.description,
  scope: "crm",
  version: "1.0.80",
  steps: [
    {
      checksum: `${enquiryMigration.key}:v1`,
      description: enquiryMigration.description,
      name: enquiryMigration.key,
      up: migrateEnquiryModule,
      version: 1
    },
    {
      checksum: "crm.enquiry.scheduling-v2:v1",
      description: "Add enquiry list and due date.",
      name: "crm.enquiry.scheduling-v2",
      up: addEnquiryScheduling,
      version: 2
    },
    {
      checksum: "crm.enquiry.number-v3:v1",
      description: "Add unique editable enquiry numbers and a number sequence.",
      name: "crm.enquiry.number-v3",
      up: addEnquiryNumber,
      version: 3
    },
    {
      checksum: "crm.enquiry.number-sequence-audit-v4:v1",
      description: "Apply tenant audit columns to the enquiry number counter.",
      name: "crm.enquiry.number-sequence-audit-v4",
      up: addEnquiryNumberSequenceAudit,
      version: 4
    }
  ]
};

export const crmTenantMigrations = batch.steps.map(({ description, name }) => ({
  description,
  name
}));
export const migrateCrmTenantDatabase = (database: Kysely<EnquiryDatabase>) =>
  runMigrationBatch(database, batch);
export const rollbackCrmTenantDatabase = (database: Kysely<EnquiryDatabase>) =>
  rollbackMigrationBatch(database, batch);
