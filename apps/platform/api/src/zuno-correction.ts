import { sql } from "kysely";
import { stat } from "node:fs/promises";
import { AppError } from "@cxsun/framework/errors";
import type { TextCorrectionPlan } from "@cxsun/zuno-api";
import { getTenantDatabase } from "./database/tenant-database.js";
import { TenantRepository } from "./modules/tenant/index.js";
import { DatabaseMaintenanceRepository } from "./modules/database-maintenance/index.js";
import { validateZunoTextCorrectionPlan } from "./zuno-correction-policy.js";

const textTypes = new Set(["char", "varchar", "tinytext", "text", "mediumtext", "longtext"]);

async function resolveCorrection(tenantId: number, plan: TextCorrectionPlan) {
  validateZunoTextCorrectionPlan(plan);
  const tenant = await new TenantRepository().findByIdOrCode(String(tenantId));
  if (!tenant || tenant.id !== tenantId) throw AppError.validation("Target tenant was not found.");
  const database = getTenantDatabase(tenant);
  const columns = await sql<{ COLUMN_NAME: string; DATA_TYPE: string; COLUMN_KEY: string }>`
    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${plan.table}
      AND COLUMN_NAME IN (${plan.column}, 'id')
  `.execute(database);
  const target = columns.rows.find((column) => column.COLUMN_NAME === plan.column);
  const id = columns.rows.find((column) => column.COLUMN_NAME === "id");
  if (
    !target ||
    !textTypes.has(target.DATA_TYPE.toLowerCase()) ||
    target.COLUMN_KEY ||
    !id ||
    id.COLUMN_KEY !== "PRI" ||
    !["int", "bigint"].includes(id.DATA_TYPE.toLowerCase())
  ) {
    throw AppError.validation(
      "Direct corrections require a non-key text column and numeric primary id."
    );
  }
  return { database, tenant };
}

export async function previewZunoTextCorrection(tenantId: number, plan: TextCorrectionPlan) {
  const { database } = await resolveCorrection(tenantId, plan);
  const result = await sql<{ current_value: string | null }>`
    SELECT ${sql.id(plan.column)} AS current_value FROM ${sql.id(plan.table)}
    WHERE id = ${plan.rowId} LIMIT 1
  `.execute(database);
  if (result.rows.length !== 1) throw AppError.validation("The target row was not found.");
  return {
    currentValue: result.rows[0]?.current_value ?? null,
    sql: `UPDATE \`${plan.table}\` SET \`${plan.column}\` = ? WHERE id = ? AND \`${plan.column}\` = ? (one row, tenant ${tenantId})`
  };
}

export async function executeZunoTextCorrection(tenantId: number, plan: TextCorrectionPlan) {
  const { database, tenant } = await resolveCorrection(tenantId, plan);
  const backup = await new DatabaseMaintenanceRepository().latestCompletedBackup(
    "tenant",
    String(tenantId)
  );
  if (
    !backup?.completedAt ||
    backup.databaseName !== tenant.dbName ||
    Date.now() - new Date(backup.completedAt).getTime() > 36 * 60 * 60 * 1000
  ) {
    throw AppError.validation(
      "A completed tenant backup from the last 36 hours is required before SQL execution."
    );
  }
  const backupPath = backup.details.filePath;
  if (
    typeof backupPath !== "string" ||
    !backup.details.verifiedAt ||
    !backup.details.checksum ||
    (await stat(backupPath).catch(() => null))?.size !== backup.details.sizeBytes
  ) {
    throw AppError.validation("The recent backup artifact is unavailable or incomplete.");
  }
  await database.transaction().execute(async (transaction) => {
    const current = await sql<{ current_value: string | null }>`
      SELECT ${sql.id(plan.column)} AS current_value FROM ${sql.id(plan.table)}
      WHERE id = ${plan.rowId} FOR UPDATE
    `.execute(transaction);
    if (current.rows.length !== 1 || current.rows[0]?.current_value !== plan.expectedValue) {
      throw AppError.validation(
        "The row changed since approval. Create and approve a new correction plan."
      );
    }
    const result = await sql`
      UPDATE ${sql.id(plan.table)} SET ${sql.id(plan.column)} = ${plan.replacementValue}
      WHERE id = ${plan.rowId} AND ${sql.id(plan.column)} = ${plan.expectedValue}
    `.execute(transaction);
    if (Number(result.numAffectedRows) !== 1)
      throw AppError.validation("The correction did not update exactly one row.");
  });
  return {
    backupRunId: backup.id,
    sql: `Updated ${plan.table}.${plan.column} for row ${plan.rowId} in tenant ${tenantId}.`
  };
}
