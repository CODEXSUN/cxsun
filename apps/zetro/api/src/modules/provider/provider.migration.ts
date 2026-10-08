import { sql, type Kysely } from "kysely";
import type { ZetroProviderDatabase } from "./provider.types.js";

export const zetroProviderMigrations = [
  {
    name: "zetro.provider.v1",
    description: "Store encrypted provider settings in each tenant database."
  }
];

export async function migrateZetroProviderDatabase(database: Kysely<ZetroProviderDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS zetro_provider_settings (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL DEFAULT 'settings' UNIQUE,
    provider VARCHAR(24) NOT NULL,
    base_url VARCHAR(2048) NOT NULL,
    model VARCHAR(191) NOT NULL,
    encrypted_api_key TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system',
    updated_by VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw("ALTER TABLE zetro_provider_settings MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT")
    .execute(database);
  for (const [name, definition] of [
    ["uuid", "CHAR(8) NOT NULL DEFAULT 'settings' UNIQUE"],
    ["status", "VARCHAR(16) NOT NULL DEFAULT 'active'"],
    ["created_by", "VARCHAR(191) NOT NULL DEFAULT 'system'"]
  ] as const) {
    const columns = await sql<{
      count: number;
    }>`SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'zetro_provider_settings' AND column_name = ${name}`.execute(
      database
    );
    if (Number(columns.rows[0]?.count ?? 0) === 0) {
      await sql
        .raw(`ALTER TABLE zetro_provider_settings ADD COLUMN ${name} ${definition}`)
        .execute(database);
    }
  }
}

export async function rollbackZetroProviderDatabase(database: Kysely<ZetroProviderDatabase>) {
  await sql.raw("DROP TABLE IF EXISTS zetro_provider_settings").execute(database);
}
