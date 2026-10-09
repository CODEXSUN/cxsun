import { sql, type Kysely } from "kysely";
import type { ZetroDatabase } from "./chat.types.js";
import { ZETRO_QUERY_PATTERNS } from "./chat.patterns.js";

export const zetroChatMigrations = [
  { name: "zetro.chat.v1", description: "Store Zetro conversations and messages per tenant." },
  { name: "zetro.chat.v2", description: "Retain review history and tenant capability decisions." },
  { name: "zetro.chat.v3", description: "Record Zetro interactions and rule versions for review." },
  { name: "zetro.chat.v4", description: "Catalog numbered Zetro query patterns per tenant." },
  { name: "zetro.chat.v5", description: "Catalog daily, monthly, and aged sales reads." }
];

export async function migrateZetroChatDatabase(database: Kysely<ZetroDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_conversations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    owner_email VARCHAR(191) NOT NULL,
    title VARCHAR(160) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_conversations_owner_updated (owner_email, updated_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    conversation_id INT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_messages_conversation_id (conversation_id, id),
    CONSTRAINT zetro_messages_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  const columns = await sql<{
    count: number;
  }>`SELECT COUNT(*) AS count FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'zetro_conversations' AND column_name = 'deleted_at'`.execute(
    database
  );
  if (Number(columns.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE zetro_conversations ADD COLUMN deleted_at DATETIME NULL")
      .execute(database);
  }
  await ensureColumn(
    database,
    "zetro_conversations",
    "status",
    "VARCHAR(16) NOT NULL DEFAULT 'active'"
  );
  await ensureColumn(
    database,
    "zetro_conversations",
    "created_by",
    "VARCHAR(191) NOT NULL DEFAULT 'system'"
  );
  await ensureColumn(database, "zetro_messages", "status", "VARCHAR(16) NOT NULL DEFAULT 'active'");
  await ensureColumn(
    database,
    "zetro_messages",
    "created_by",
    "VARCHAR(191) NOT NULL DEFAULT 'system'"
  );
  await ensureColumn(
    database,
    "zetro_messages",
    "updated_at",
    "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_capability_grants (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    role_key VARCHAR(100) NOT NULL,
    capability_key VARCHAR(100) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    approved_by VARCHAR(191) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY zetro_capability_grant_role (role_key, capability_key)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_tool_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    conversation_id INT NULL,
    actor_email VARCHAR(191) NOT NULL,
    capability_key VARCHAR(100) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    request_json TEXT NOT NULL,
    result_json TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_tool_events_actor (actor_email, created_at),
    CONSTRAINT zetro_tool_events_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE SET NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_policy_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    role_key VARCHAR(100) NOT NULL,
    capability_key VARCHAR(100) NOT NULL,
    status VARCHAR(16) NOT NULL,
    decided_by VARCHAR(191) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_policy_events_role (role_key, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_review_notes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    conversation_id INT NOT NULL,
    reviewer_email VARCHAR(191) NOT NULL,
    note TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_review_notes_conversation (conversation_id, id),
    CONSTRAINT zetro_review_notes_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_approval_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    conversation_id INT NULL,
    actor_email VARCHAR(191) NOT NULL,
    capability_key VARCHAR(100) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    request_json TEXT NOT NULL,
    decided_by VARCHAR(191) NULL,
    decision_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_approval_requests_status (status, created_at),
    CONSTRAINT zetro_approval_requests_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE SET NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_interaction_logs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL UNIQUE,
    conversation_id INT NULL,
    actor_email VARCHAR(191) NOT NULL,
    prompt_text TEXT NOT NULL,
    response_text TEXT NULL,
    intent VARCHAR(32) NOT NULL,
    skill_key VARCHAR(100) NULL,
    skill_decision VARCHAR(16) NULL,
    outcome VARCHAR(16) NOT NULL,
    error_code VARCHAR(64) NULL,
    rules_hash CHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX zetro_interaction_actor (actor_email, created_at),
    INDEX zetro_interaction_review (outcome, created_at),
    INDEX zetro_interaction_conversation (conversation_id, id),
    CONSTRAINT zetro_interaction_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE SET NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_query_patterns (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    serial_no INT NOT NULL UNIQUE,
    intent_key VARCHAR(32) NULL,
    question_pattern VARCHAR(500) NOT NULL,
    query_pattern VARCHAR(100) NOT NULL,
    limitation VARCHAR(500) NOT NULL,
    extra TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    updated_by VARCHAR(191) NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  for (const pattern of ZETRO_QUERY_PATTERNS) {
    await sql`INSERT IGNORE INTO zetro_query_patterns
      (uuid, serial_no, intent_key, question_pattern, query_pattern, limitation, extra, status)
      VALUES (${pattern.uuid}, ${pattern.serialNo}, ${pattern.intent}, ${pattern.questionPattern},
        ${pattern.queryPattern}, ${pattern.limitation}, ${pattern.extra}, 'active')`.execute(
      database
    );
    const recorded = await sql<{
      serial_no: number;
      query_pattern: string;
      status: string;
    }>`SELECT serial_no, query_pattern, status
      FROM zetro_query_patterns WHERE uuid=${pattern.uuid} LIMIT 1`.execute(database);
    if (
      Number(recorded.rows[0]?.serial_no) !== pattern.serialNo ||
      recorded.rows[0]?.query_pattern !== pattern.queryPattern ||
      recorded.rows[0]?.status !== "active"
    ) {
      throw new Error(`Zetro catalog entry #${pattern.serialNo} conflicts with a tenant pattern.`);
    }
  }
  await ensureColumn(database, "zetro_interaction_logs", "pattern_uuid", "CHAR(36) NULL");
}

async function ensureColumn(
  database: Kysely<ZetroDatabase>,
  table: "zetro_conversations" | "zetro_messages" | "zetro_interaction_logs",
  column: "status" | "created_by" | "updated_at" | "pattern_uuid",
  definition: string
) {
  const existing = await sql<{
    count: number;
  }>`SELECT COUNT(*) AS count FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name=${table} AND column_name=${column}`.execute(
    database
  );
  if (Number(existing.rows[0]?.count ?? 0) === 0) {
    await sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).execute(database);
  }
}

export async function rollbackZetroChatDatabase(database: Kysely<ZetroDatabase>) {
  await sql.raw("DROP TABLE IF EXISTS zetro_query_patterns").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_interaction_logs").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_approval_requests").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_review_notes").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_tool_events").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_policy_events").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_capability_grants").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_messages").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_conversations").execute(database);
}
