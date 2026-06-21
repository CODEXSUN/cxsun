import { randomUUID } from "node:crypto"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { TenantConnectionVerification, TenantUpgradePlan, TenantUpgradePreflight, TenantUpgradePreflightCheck } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"
import { getTenantUpgradePlan } from "./tenant-upgrade-planner.js"
import { getTenantBackup } from "./tenant-backup-manager.js"

type ActiveBaselineRow = RowDataPacket & { id: string }
type PreflightRow = RowDataPacket & { report_json: string }
type GrantRow = RowDataPacket & Record<string, string>

export async function runTenantUpgradePreflight(id: string): Promise<TenantUpgradePreflight> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const plan = await getTenantUpgradePlan(id)
  if (!plan) throw new Error("Generate an upgrade plan before running preflight.")
  const checks: TenantUpgradePreflightCheck[] = []

  checks.push(await checkBaseline(id, plan))
  checks.push(checkPlanAge(plan))
  checks.push(checkHandshake(tenant.lastHandshake))
  checks.push(checkVersions(tenant.lastHandshake))
  checks.push(checkPlanRisk(plan))
  checks.push(checkPlanCoverage(plan))
  checks.push(await checkMariaDbAccess(tenant))
  checks.push(await checkBackup(id, plan))

  const report: TenantUpgradePreflight = {
    checkedAt: new Date().toISOString(),
    checks,
    id: randomUUID(),
    planId: plan.id,
    ready: checks.every((check) => check.status !== "blocked"),
    summary: {
      blocked: checks.filter((check) => check.status === "blocked").length,
      passed: checks.filter((check) => check.status === "pass").length,
      warnings: checks.filter((check) => check.status === "warning").length,
    },
  }
  await savePreflight(id, report)
  return report
}

export async function getTenantUpgradePreflight(id: string): Promise<TenantUpgradePreflight | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<PreflightRow[]>(
    "SELECT report_json FROM cxsync_upgrade_preflights WHERE tenant_connection_id = ? ORDER BY checked_at DESC LIMIT 1",
    [id],
  )
  return rows[0] ? JSON.parse(rows[0].report_json) as TenantUpgradePreflight : null
}

async function checkBaseline(id: string, plan: TenantUpgradePlan): Promise<TenantUpgradePreflightCheck> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<ActiveBaselineRow[]>(
    "SELECT id FROM cxsync_schema_baselines WHERE tenant_connection_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
    [id],
  )
  const matches = rows[0]?.id === plan.baselineId
  return { id: "baseline", label: "Active baseline", status: matches ? "pass" : "blocked", detail: matches ? "The plan is tied to the active expected-schema baseline." : "The active baseline changed after this plan was generated. Generate a new plan." }
}

function checkPlanAge(plan: TenantUpgradePlan): TenantUpgradePreflightCheck {
  const ageHours = (Date.now() - new Date(plan.createdAt).getTime()) / 3_600_000
  return { id: "plan-age", label: "Plan freshness", status: ageHours <= 24 ? "pass" : "warning", detail: ageHours <= 24 ? "The plan was generated within the last 24 hours." : "The plan is older than 24 hours. Generate it again before execution." }
}

function checkHandshake(handshake: TenantConnectionVerification | null): TenantUpgradePreflightCheck {
  const healthy = Boolean(handshake?.local.ok && handshake.cloud.ok)
  return { id: "handshake", label: "Local and cloud handshake", status: healthy ? "pass" : "blocked", detail: healthy ? "The latest local and cloud connection check passed." : "Run a successful handshake before preparing an upgrade." }
}

function checkVersions(handshake: TenantConnectionVerification | null): TenantUpgradePreflightCheck {
  return { id: "versions", label: "Application versions", status: handshake?.versionsMatch ? "pass" : "warning", detail: handshake?.versionsMatch ? "Local and cloud versions match." : "Local and cloud versions differ; confirm the intended migration direction." }
}

function checkPlanRisk(plan: TenantUpgradePlan): TenantUpgradePreflightCheck {
  return { id: "risk", label: "Destructive operations", status: plan.summary.destructive ? "blocked" : "pass", detail: plan.summary.destructive ? `${plan.summary.destructive} destructive or removal step(s) require an explicit exclusion or manual decision.` : "No destructive operations are proposed." }
}

function checkPlanCoverage(plan: TenantUpgradePlan): TenantUpgradePreflightCheck {
  const manual = plan.steps.filter((step) => !step.statement).length
  return { id: "coverage", label: "Migration coverage", status: manual ? "warning" : "pass", detail: manual ? `${manual} step(s) must use their owning backend migration or manual procedure.` : "Every plan step has a reviewable SQL suggestion." }
}

async function checkMariaDbAccess(tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>): Promise<TenantUpgradePreflightCheck> {
  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({ connectTimeout: 8_000, database: tenant.localDatabase, host: tenant.localHost, password: tenant.localPassword, port: tenant.localPort, user: tenant.localUser })
    const [rows] = await connection.query<GrantRow[]>("SHOW GRANTS FOR CURRENT_USER")
    const grants = rows.flatMap((row) => Object.values(row)).join(" ").toUpperCase()
    const capable = grants.includes("ALL PRIVILEGES") || (["ALTER", "CREATE", "INDEX"].every((privilege) => grants.includes(privilege)))
    return { id: "privileges", label: "MariaDB upgrade privileges", status: capable ? "pass" : "blocked", detail: capable ? "The local database user exposes ALTER, CREATE, and INDEX privileges." : "The local database user does not expose all required schema-upgrade privileges." }
  } catch (error) {
    return { id: "privileges", label: "MariaDB upgrade privileges", status: "blocked", detail: error instanceof Error ? error.message : "MariaDB privilege verification failed." }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

async function checkBackup(id: string, plan: TenantUpgradePlan): Promise<TenantUpgradePreflightCheck> {
  const backup = await getTenantBackup(id)
  const verified = backup?.status === "restore-verified" && backup.planId === plan.id && new Date(backup.createdAt) >= new Date(plan.createdAt)
  return {
    id: "backup",
    label: "Recovery backup",
    status: verified ? "pass" : "blocked",
    detail: verified
      ? `Restore-tested backup ${backup.fileName} (${backup.tableCount} tables, ${backup.sha256.slice(0, 12)}…).`
      : "Create and restore-test a tenant backup for this exact upgrade plan before schema execution.",
  }
}

async function savePreflight(id: string, report: TenantUpgradePreflight) {
  const database = await getCxSyncDatabase()
  const checkedAt = sqlDate(new Date(report.checkedAt))
  await database.execute(
    `INSERT INTO cxsync_upgrade_preflights
      (id, tenant_connection_id, plan_id, ready, passed_count, warning_count, blocked_count, report_json, checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [report.id, id, report.planId, report.ready ? 1 : 0, report.summary.passed, report.summary.warnings, report.summary.blocked, JSON.stringify(report), checkedAt],
  )
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}
