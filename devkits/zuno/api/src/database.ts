import type { Kysely } from "kysely";
import {
  rollbackMigrationBatch,
  runMigrationBatch,
  type MigrationBatch
} from "@cxsun/framework/db";
import { casesMigration, migrateCasesModule } from "./modules/cases/cases.migration.js";
import {
  conversationsMigration,
  migrateConversationsModule
} from "./modules/conversations/conversations.migration.js";
import type { ZunoDatabase } from "./modules/cases/cases.types.js";

export const zunoMigrationBatch: MigrationBatch<ZunoDatabase> = {
  batch: 1,
  description: "Zuno operations case records.",
  scope: "zuno",
  version: "1.0.80",
  steps: [
    {
      checksum: `${casesMigration.key}:v1`,
      description: casesMigration.description,
      name: casesMigration.key,
      up: migrateCasesModule,
      version: 1
    },
    {
      checksum: `${conversationsMigration.key}:v1`,
      description: conversationsMigration.description,
      name: conversationsMigration.key,
      up: migrateConversationsModule,
      version: 1
    }
  ]
};

export async function migrateZunoDatabase(database: Kysely<ZunoDatabase>) {
  return runMigrationBatch(database, zunoMigrationBatch);
}

export async function rollbackZunoDatabase(database: Kysely<ZunoDatabase>) {
  return rollbackMigrationBatch(database, zunoMigrationBatch);
}
