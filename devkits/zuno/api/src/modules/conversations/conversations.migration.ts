import { sql, type Kysely } from "kysely";
import type { ZunoDatabase } from "../cases/cases.types.js";

export const conversationsMigration = {
  key: "zuno.conversations.v1",
  description: "Durable Zuno chat threads and messages."
} as const;

export async function migrateConversationsModule(database: Kysely<ZunoDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS zuno_threads (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      title VARCHAR(255) NOT NULL,
      mode VARCHAR(24) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_zuno_threads_uuid (uuid),
      KEY idx_zuno_threads_owner_updated (created_by, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS zuno_messages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      thread_uuid VARCHAR(8) NOT NULL,
      role VARCHAR(16) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'complete',
      content MEDIUMTEXT NOT NULL,
      evidence_json MEDIUMTEXT NOT NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_zuno_messages_uuid (uuid),
      KEY idx_zuno_messages_thread (thread_uuid, id),
      CONSTRAINT fk_zuno_messages_thread FOREIGN KEY (thread_uuid) REFERENCES zuno_threads (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
