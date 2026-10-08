import { sql, type Kysely } from "kysely";
import type { ZunoDatabase } from "./cases.types.js";

export const casesMigration = {
  key: "zuno.cases.v1",
  description: "Zuno operations cases and append-only activity."
} as const;

export async function migrateCasesModule(database: Kysely<ZunoDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS zuno_cases (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      kind VARCHAR(32) NOT NULL,
      severity VARCHAR(16) NOT NULL,
      status VARCHAR(24) NOT NULL,
      tenant_id INT NULL,
      title VARCHAR(255) NOT NULL,
      description MEDIUMTEXT NOT NULL,
      proposal MEDIUMTEXT NOT NULL,
      sql_plan TEXT NOT NULL,
      verification MEDIUMTEXT NOT NULL,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_zuno_cases_uuid (uuid),
      KEY idx_zuno_cases_status_updated (status, updated_at),
      KEY idx_zuno_cases_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS zuno_case_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL,
      case_uuid VARCHAR(8) NOT NULL,
      action VARCHAR(32) NOT NULL,
      detail TEXT NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_zuno_case_activity_uuid (uuid),
      KEY idx_zuno_case_activity_case (case_uuid, created_at),
      CONSTRAINT fk_zuno_case_activity_case FOREIGN KEY (case_uuid) REFERENCES zuno_cases (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
