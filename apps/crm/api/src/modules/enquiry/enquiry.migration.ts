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

async function addEnquiryAlerts(database: Kysely<EnquiryDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_alerts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    enquiry_id INT NOT NULL,
    user_id INT NOT NULL,
    kind VARCHAR(24) NOT NULL,
    read_at DATETIME NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiry_alerts_user_read (user_id, read_at, created_at),
    CONSTRAINT crm_enquiry_alerts_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries (id) ON DELETE RESTRICT,
    CONSTRAINT crm_enquiry_alerts_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

async function addEnquiryListIndexes(database: Kysely<EnquiryDatabase>) {
  const result = await sql<{ index_name: string }>`
    SELECT DISTINCT INDEX_NAME AS index_name
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiries'
  `.execute(database);
  const indexes = new Set(result.rows.map((row) => row.index_name));
  for (const [name, columns] of [
    ["crm_enquiries_created_number", "created_by, enquiry_no"],
    ["crm_enquiries_assigned_number", "assigned_user_id, enquiry_no"],
    ["crm_enquiries_status_number", "status_id, enquiry_no"]
  ] as const) {
    if (!indexes.has(name)) {
      await sql.raw(`ALTER TABLE crm_enquiries ADD INDEX ${name} (${columns})`).execute(database);
    }
  }
}

async function addEnquiryComments(database: Kysely<EnquiryDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    enquiry_id INT NOT NULL,
    parent_id INT NULL,
    body TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiry_comments_enquiry_created (enquiry_id, created_at, id),
    INDEX crm_enquiry_comments_parent (parent_id),
    CONSTRAINT crm_enquiry_comments_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries (id) ON DELETE RESTRICT,
    CONSTRAINT crm_enquiry_comments_parent_fk FOREIGN KEY (parent_id) REFERENCES crm_enquiry_comments (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql`INSERT INTO crm_enquiry_comments (enquiry_id, parent_id, body, created_by, created_at, updated_at)
    SELECT enquiry.id, NULL, enquiry.description, enquiry.created_by, enquiry.created_at, enquiry.created_at
    FROM crm_enquiries AS enquiry
    WHERE TRIM(COALESCE(enquiry.description, '')) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM crm_enquiry_comments AS comment
        WHERE comment.enquiry_id = enquiry.id
      )`.execute(database);
}

async function addEnquiryWork(database: Kysely<EnquiryDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_activity (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    enquiry_id INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiry_activity_enquiry_created (enquiry_id, created_at, id),
    CONSTRAINT crm_enquiry_activity_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_jobs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    enquiry_id INT NOT NULL,
    employee_user_id INT NULL,
    employee VARCHAR(191) NOT NULL,
    start_at DATETIME NOT NULL,
    stop_at DATETIME NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    rate_per_hour DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'running',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiry_jobs_enquiry_status (enquiry_id, status),
    CONSTRAINT crm_enquiry_jobs_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries (id) ON DELETE RESTRICT,
    CONSTRAINT crm_enquiry_jobs_employee_fk FOREIGN KEY (employee_user_id) REFERENCES app_users (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_estimates (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    enquiry_id INT NOT NULL,
    estimate_date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    supplier_contact_id INT NOT NULL,
    supplier_name VARCHAR(191) NOT NULL,
    price DECIMAL(14,2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX crm_enquiry_estimates_enquiry_date (enquiry_id, estimate_date),
    INDEX crm_enquiry_estimates_supplier (supplier_contact_id),
    CONSTRAINT crm_enquiry_estimates_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries (id) ON DELETE RESTRICT,
    CONSTRAINT crm_enquiry_estimates_supplier_fk FOREIGN KEY (supplier_contact_id) REFERENCES core_contacts (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql`INSERT INTO crm_enquiry_activity (enquiry_id, action, details, created_by, created_at, updated_at)
    SELECT enquiry.id, 'created', CONCAT('Enquiry #', enquiry.enquiry_no, ' created'),
      enquiry.created_by, enquiry.created_at, enquiry.created_at
    FROM crm_enquiries AS enquiry
    WHERE NOT EXISTS (SELECT 1 FROM crm_enquiry_activity AS activity WHERE activity.enquiry_id=enquiry.id)`.execute(
    database
  );
}

async function addCommentFormat(database: Kysely<EnquiryDatabase>) {
  const columns = await sql<{ column_name: string }>`SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME='crm_enquiry_comments' AND COLUMN_NAME='body_format'`.execute(database);
  if (columns.rows.length === 0) {
    await sql
      .raw(
        "ALTER TABLE crm_enquiry_comments ADD COLUMN body_format VARCHAR(16) NOT NULL DEFAULT 'plain'"
      )
      .execute(database);
  }
}

async function addJobEmployeeReference(database: Kysely<EnquiryDatabase>) {
  const columns = await sql<{ column_name: string }>`SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME='crm_enquiry_jobs' AND COLUMN_NAME='employee_user_id'`.execute(database);
  if (columns.rows.length === 0) {
    await sql
      .raw("ALTER TABLE crm_enquiry_jobs ADD COLUMN employee_user_id INT NULL AFTER enquiry_id")
      .execute(database);
  }
  const constraints = await sql<{
    constraint_name: string;
  }>`SELECT CONSTRAINT_NAME AS constraint_name
    FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME='crm_enquiry_jobs' AND CONSTRAINT_NAME='crm_enquiry_jobs_employee_fk'`.execute(
    database
  );
  if (constraints.rows.length === 0) {
    await sql
      .raw(
        "ALTER TABLE crm_enquiry_jobs ADD CONSTRAINT crm_enquiry_jobs_employee_fk FOREIGN KEY (employee_user_id) REFERENCES app_users (id) ON DELETE RESTRICT"
      )
      .execute(database);
  }
}

async function addEnquiryMasterReferences(database: Kysely<EnquiryDatabase>) {
  const columns = await sql<{ column_name: string }>`SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_enquiries'`.execute(
    database
  );
  const existing = new Set(columns.rows.map((row) => row.column_name));
  for (const column of ["list_in_id", "status_id", "priority_id"] as const) {
    if (!existing.has(column)) {
      await sql.raw(`ALTER TABLE crm_enquiries ADD COLUMN ${column} INT NULL`).execute(database);
    }
  }

  await sql`INSERT INTO crm_enquiry_lists (name, sort_order)
    SELECT DISTINCT TRIM(list_in), 1000 FROM crm_enquiries
    WHERE list_in IS NOT NULL AND TRIM(list_in) <> ''
    ON DUPLICATE KEY UPDATE crm_enquiry_lists.id=crm_enquiry_lists.id`.execute(database);
  await sql`INSERT INTO crm_enquiry_statuses (code, name, sort_order)
    SELECT DISTINCT LOWER(TRIM(status)),
      CONCAT(UPPER(LEFT(TRIM(status), 1)), SUBSTRING(TRIM(status), 2)),
      CASE status WHEN 'new' THEN 1 WHEN 'contacted' THEN 2
        WHEN 'qualified' THEN 3 WHEN 'unqualified' THEN 4 ELSE 1000 END
    FROM crm_enquiries ON DUPLICATE KEY UPDATE crm_enquiry_statuses.id=crm_enquiry_statuses.id`.execute(
    database
  );
  await sql`INSERT INTO crm_enquiry_priorities (code, name, sort_order)
    SELECT DISTINCT LOWER(TRIM(priority)),
      CONCAT(UPPER(LEFT(TRIM(priority), 1)), SUBSTRING(TRIM(priority), 2)),
      CASE priority WHEN 'low' THEN 1 WHEN 'normal' THEN 2 WHEN 'high' THEN 3 ELSE 1000 END
    FROM crm_enquiries ON DUPLICATE KEY UPDATE crm_enquiry_priorities.id=crm_enquiry_priorities.id`.execute(
    database
  );

  await sql`UPDATE crm_enquiries AS enquiry
    LEFT JOIN crm_enquiry_lists AS list ON list.name=TRIM(enquiry.list_in)
    INNER JOIN crm_enquiry_statuses AS status ON status.code=LOWER(TRIM(enquiry.status))
    INNER JOIN crm_enquiry_priorities AS priority ON priority.code=LOWER(TRIM(enquiry.priority))
    SET enquiry.list_in_id=list.id, enquiry.status_id=status.id,
      enquiry.priority_id=priority.id
    WHERE enquiry.status_id IS NULL OR enquiry.priority_id IS NULL OR
      (enquiry.list_in IS NOT NULL AND enquiry.list_in_id IS NULL)`.execute(database);
  const missing = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM crm_enquiries
    WHERE status_id IS NULL OR priority_id IS NULL`.execute(database);
  if (Number(missing.rows[0]?.count ?? 0) > 0) {
    throw new Error("CRM enquiry master backfill left records without status or priority.");
  }
  await sql.raw("ALTER TABLE crm_enquiries MODIFY status_id INT NOT NULL").execute(database);
  await sql.raw("ALTER TABLE crm_enquiries MODIFY priority_id INT NOT NULL").execute(database);

  const constraints = await sql<{
    constraint_name: string;
  }>`SELECT CONSTRAINT_NAME AS constraint_name
    FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME='crm_enquiries' AND CONSTRAINT_TYPE='FOREIGN KEY'`.execute(database);
  const foreignKeys = new Set(constraints.rows.map((row) => row.constraint_name));
  for (const [name, column, table] of [
    ["crm_enquiries_list_in_fk", "list_in_id", "crm_enquiry_lists"],
    ["crm_enquiries_status_fk", "status_id", "crm_enquiry_statuses"],
    ["crm_enquiries_priority_fk", "priority_id", "crm_enquiry_priorities"]
  ] as const) {
    if (!foreignKeys.has(name)) {
      await sql
        .raw(
          `ALTER TABLE crm_enquiries ADD CONSTRAINT ${name}
        FOREIGN KEY (${column}) REFERENCES ${table} (id) ON DELETE RESTRICT`
        )
        .execute(database);
    }
  }
}

export const enquiryMigrationBatch: MigrationBatch<EnquiryDatabase> = {
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
    },
    {
      checksum: "crm.enquiry.comments-v5:v1",
      description: "Add enquiry comments and retain existing enquiry messages as first comments.",
      name: "crm.enquiry.comments-v5",
      up: addEnquiryComments,
      version: 5
    },
    {
      checksum: "crm.enquiry.work-v6:v1",
      description: "Add enquiry jobs, estimates, and activity history.",
      name: "crm.enquiry.work-v6",
      up: addEnquiryWork,
      version: 6
    },
    {
      checksum: "crm.enquiry.comment-format-v7:v1",
      description: "Record whether an enquiry comment contains safe formatted text.",
      name: "crm.enquiry.comment-format-v7",
      up: addCommentFormat,
      version: 7
    },
    {
      checksum: "crm.enquiry.job-employee-v8:v1",
      description: "Link manually recorded enquiry jobs to tenant users.",
      name: "crm.enquiry.job-employee-v8",
      up: addJobEmployeeReference,
      version: 8
    },
    {
      checksum: "crm.enquiry.master-references-v9:v1",
      description: "Backfill enquiry List In, Status, and Priority foreign references.",
      name: "crm.enquiry.master-references-v9",
      up: addEnquiryMasterReferences,
      version: 9
    },
    {
      checksum: "crm.enquiry.alerts-v10:v1",
      description: "Add persistent assignment alerts for enquiry assignees.",
      name: "crm.enquiry.alerts-v10",
      up: addEnquiryAlerts,
      version: 10
    },
    {
      checksum: "crm.enquiry.list-indexes-v11:v1",
      description: "Index enquiry ownership and status for paged lists.",
      name: "crm.enquiry.list-indexes-v11",
      up: addEnquiryListIndexes,
      version: 11
    }
  ]
};

export const migrateCrmTenantDatabase = (database: Kysely<EnquiryDatabase>) =>
  runMigrationBatch(database, enquiryMigrationBatch);
export const rollbackCrmTenantDatabase = (database: Kysely<EnquiryDatabase>) =>
  rollbackMigrationBatch(database, enquiryMigrationBatch);
