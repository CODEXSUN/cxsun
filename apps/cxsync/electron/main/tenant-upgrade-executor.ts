import { randomUUID } from "node:crypto"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { TenantUpgradeExecution, TenantUpgradeExecutionStep, TenantUpgradePlanStep } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"
import { getTenantBackup } from "./tenant-backup-manager.js"
import { getTenantUpgradePlan } from "./tenant-upgrade-planner.js"
import { getTenantUpgradePreflight } from "./tenant-upgrade-preflight.js"

type ExecutionRow = RowDataPacket & { report_json: string }

export async function executeTenantUpgrade(id: string): Promise<TenantUpgradeExecution> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const plan = await getTenantUpgradePlan(id)
  if (!plan) throw new Error("Generate an upgrade plan before execution.")
  const preflight = await getTenantUpgradePreflight(id)
  if (!preflight || preflight.planId !== plan.id || !preflight.ready) {
    throw new Error("Run a passing preflight for the current plan before execution.")
  }
  const backup = await getTenantBackup(id)
  if (!backup || backup.planId !== plan.id || backup.status !== "restore-verified") {
    throw new Error("Create a restore-tested backup for the current plan before execution.")
  }

  const execution: TenantUpgradeExecution = {
    backupId: backup.id,
    completedAt: null,
    id: randomUUID(),
    planId: plan.id,
    preflightId: preflight.id,
    startedAt: new Date().toISOString(),
    status: "running",
    steps: plan.steps.map(toExecutionStep),
    summary: { applied: 0, failed: 0, skipped: 0, total: plan.steps.length },
  }
  await saveExecution(id, execution)

  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      connectTimeout: 8_000,
      database: tenant.localDatabase,
      host: tenant.localHost,
      multipleStatements: false,
      password: tenant.localPassword,
      port: tenant.localPort,
      user: tenant.localUser,
    })
    await connection.query("SET SESSION lock_wait_timeout = 10").catch(() => undefined)

    for (const step of plan.steps) {
      const current = execution.steps.find((item) => item.id === step.id)
      if (!current) continue
      if (!step.statement) {
        markSkipped(current, "No executable SQL was generated. Use the owning backend migration or manual repair.")
        continue
      }
      const safeStatement = executableStatement(step)
      if (!safeStatement) {
        markSkipped(current, "Statement is outside CXSync's executable allow-list and was not run.")
        continue
      }
      current.status = "running"
      current.startedAt = new Date().toISOString()
      const start = Date.now()
      try {
        await connection.query(safeStatement)
        current.status = "applied"
        current.detail = "Statement applied to the local tenant database."
      } catch (error) {
        current.status = "failed"
        current.error = error instanceof Error ? error.message : "SQL execution failed."
        current.detail = "Execution stopped at this step. Review the tenant database before retrying."
        execution.status = "failed"
      } finally {
        current.durationMs = Date.now() - start
        current.finishedAt = new Date().toISOString()
        summarize(execution)
        await saveExecution(id, execution)
      }
      if (current.status === "failed") break
    }

    execution.completedAt = new Date().toISOString()
    summarize(execution)
    if (execution.summary.failed) execution.status = "failed"
    else if (execution.summary.skipped) execution.status = "completed-with-skips"
    else execution.status = "completed"
    await saveExecution(id, execution)
    return execution
  } catch (error) {
    execution.completedAt = new Date().toISOString()
    execution.status = "failed"
    if (!execution.summary.failed) {
      execution.steps.push({
        detail: "Execution could not start or continue.",
        durationMs: 0,
        error: error instanceof Error ? error.message : "Upgrade execution failed.",
        finishedAt: execution.completedAt,
        id: randomUUID(),
        objectName: tenant.localDatabase,
        order: execution.steps.length + 1,
        startedAt: execution.startedAt,
        status: "failed",
        title: "Execution failure",
      })
    }
    summarize(execution)
    await saveExecution(id, execution)
    return execution
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

export async function getTenantUpgradeExecution(id: string): Promise<TenantUpgradeExecution | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<ExecutionRow[]>(
    "SELECT report_json FROM cxsync_upgrade_executions WHERE tenant_connection_id = ? ORDER BY started_at DESC LIMIT 1",
    [id],
  )
  return rows[0] ? JSON.parse(rows[0].report_json) as TenantUpgradeExecution : null
}

function toExecutionStep(step: TenantUpgradePlanStep): TenantUpgradeExecutionStep {
  return {
    detail: step.statement ? "Waiting for execution." : "Manual or migration-owned step.",
    durationMs: 0,
    error: null,
    finishedAt: null,
    id: step.id,
    objectName: step.objectName,
    order: step.order,
    startedAt: null,
    status: "pending",
    title: step.title,
  }
}

function executableStatement(step: TenantUpgradePlanStep) {
  if (step.risk === "destructive" || step.action === "remove") return null
  const statement = step.statement?.trim()
  if (!statement) return null
  const normalized = statement.endsWith(";") ? statement.slice(0, -1).trim() : statement
  if (!/^ALTER\s+TABLE\s+`[^`]+`/i.test(normalized)) return null
  if (/[;\u0000]/.test(normalized)) return null
  if (/\b(DROP|DELETE|TRUNCATE|RENAME|INSERT|REPLACE)\b/i.test(normalized)) return null
  return normalized
}

function markSkipped(step: TenantUpgradeExecutionStep, detail: string) {
  const now = new Date().toISOString()
  step.detail = detail
  step.finishedAt = now
  step.startedAt = now
  step.status = "skipped"
}

function summarize(execution: TenantUpgradeExecution) {
  execution.summary = {
    applied: execution.steps.filter((step) => step.status === "applied").length,
    failed: execution.steps.filter((step) => step.status === "failed").length,
    skipped: execution.steps.filter((step) => step.status === "skipped").length,
    total: execution.steps.length,
  }
}

async function saveExecution(id: string, execution: TenantUpgradeExecution) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_upgrade_executions
      (id, tenant_connection_id, plan_id, preflight_id, backup_id, status, applied_count, skipped_count, failed_count, report_json, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      applied_count = VALUES(applied_count),
      skipped_count = VALUES(skipped_count),
      failed_count = VALUES(failed_count),
      report_json = VALUES(report_json),
      completed_at = VALUES(completed_at)`,
    [
      execution.id,
      id,
      execution.planId,
      execution.preflightId,
      execution.backupId,
      execution.status,
      execution.summary.applied,
      execution.summary.skipped,
      execution.summary.failed,
      JSON.stringify(execution),
      sqlDate(new Date(execution.startedAt)),
      execution.completedAt ? sqlDate(new Date(execution.completedAt)) : null,
    ],
  )
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}
