import { sql, type Kysely } from "kysely";
import { quoteIdentifier } from "../../database/database-utils.js";
import type { ProjectManagerDatabase } from "../../database/schema.js";

export const ideasMigration = {
  description: "Project Manager ideas with rich content, ownership, and status.",
  key: "project-manager.ideas.sql.v1"
} as const;

export const ideasActivityAuditMigration = {
  description: "Complete standard audit columns for idea activity.",
  key: "project-manager.ideas-activity-audit.v2"
} as const;

export async function migrateIdeasModule(database: Kysely<ProjectManagerDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS project_manager_ideas (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content_html MEDIUMTEXT NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'general',
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      assignee VARCHAR(191) NOT NULL DEFAULT '',
      created_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_project_manager_ideas_uuid (uuid),
      KEY idx_project_manager_ideas_status_updated (status, updated_at),
      KEY idx_project_manager_ideas_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS project_manager_ideas_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      idea_uuid VARCHAR(8) NOT NULL,
      action VARCHAR(24) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_project_manager_ideas_activity_uuid (uuid),
      KEY idx_project_manager_ideas_activity_idea (idea_uuid, created_at),
      CONSTRAINT fk_project_manager_ideas_activity_idea
        FOREIGN KEY (idea_uuid) REFERENCES project_manager_ideas (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

export async function standardizeIdeasActivity(database: Kysely<ProjectManagerDatabase>) {
  const table = quoteIdentifier("project_manager_ideas_activity");
  for (const column of [
    "status VARCHAR(24) NOT NULL DEFAULT 'active'",
    "created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration'",
    "updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  ]) {
    await sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column}`).execute(database);
  }
}
