import { sql, type Kysely } from "kysely";
import type { ZetroDatabase } from "./chat.types.js";

export const zetroChatMigrations = [
  { name: "zetro.chat.v1", description: "Store Zetro conversations and messages per tenant." }
];

export async function migrateZetroChatDatabase(database: Kysely<ZetroDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_conversations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    owner_email VARCHAR(191) NOT NULL,
    title VARCHAR(160) NOT NULL,
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX zetro_messages_conversation_id (conversation_id, id),
    CONSTRAINT zetro_messages_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES zetro_conversations (id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}

export async function rollbackZetroChatDatabase(database: Kysely<ZetroDatabase>) {
  await sql.raw("DROP TABLE IF EXISTS zetro_messages").execute(database);
  await sql.raw("DROP TABLE IF EXISTS zetro_conversations").execute(database);
}
