import { randomUUID } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import type {
  TenantColumnInspectionItem,
  TenantDatabaseInspection,
  TenantIndexInspectionItem,
  TenantSchemaDiffItem,
  TenantUpgradePlan,
  TenantUpgradePlanStep,
} from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { compareTenantSchema } from "./tenant-database-inspector.js"

type BaselineManifestRow = RowDataPacket & { id: string; manifest_json: string }
type PlanRow = RowDataPacket & { manifest_json: string }

export async function generateTenantUpgradePlan(id: string): Promise<TenantUpgradePlan> {
  const baseline = await activeBaseline(id)
  if (!baseline) throw new Error("Build an expected schema baseline before generating an upgrade plan.")
  const expected = JSON.parse(baseline.manifest_json) as TenantDatabaseInspection
  const diff = await compareTenantSchema(id)
  const steps = buildSteps(diff.items, expected)
  const plan: TenantUpgradePlan = {
    baselineId: baseline.id,
    createdAt: new Date().toISOString(),
    diffSnapshotId: diff.diffSnapshotId,
    id: randomUUID(),
    status: "draft",
    steps,
    summary: {
      caution: steps.filter((step) => step.risk === "caution").length,
      destructive: steps.filter((step) => step.risk === "destructive").length,
      safe: steps.filter((step) => step.risk === "safe").length,
      total: steps.length,
    },
  }
  const database = await getCxSyncDatabase()
  const createdAt = sqlDate(new Date(plan.createdAt))
  await database.execute(
    `INSERT INTO cxsync_upgrade_plans
      (id, tenant_connection_id, baseline_id, diff_snapshot_id, status, safe_step_count, caution_step_count, destructive_step_count, manifest_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
    [plan.id, id, plan.baselineId, plan.diffSnapshotId, plan.summary.safe, plan.summary.caution, plan.summary.destructive, JSON.stringify(plan), createdAt, createdAt],
  )
  return plan
}

export async function getTenantUpgradePlan(id: string): Promise<TenantUpgradePlan | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<PlanRow[]>(
    "SELECT manifest_json FROM cxsync_upgrade_plans WHERE tenant_connection_id = ? ORDER BY created_at DESC LIMIT 1",
    [id],
  )
  return rows[0] ? JSON.parse(rows[0].manifest_json) as TenantUpgradePlan : null
}

async function activeBaseline(id: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<BaselineManifestRow[]>(
    "SELECT id, manifest_json FROM cxsync_schema_baselines WHERE tenant_connection_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
    [id],
  )
  return rows[0] ?? null
}

function buildSteps(items: TenantSchemaDiffItem[], expected: TenantDatabaseInspection) {
  const columns = new Map(expected.columns.map((column) => [`${column.tableName}.${column.columnName}`, column]))
  const indexes = groupIndexes(expected.indexes)
  const seen = new Set<string>()
  const steps: TenantUpgradePlanStep[] = []
  for (const item of [...items].sort(compareDiffItems)) {
    const dedupeKey = item.objectType === "primary-key" ? `${item.objectName}.PRIMARY` : item.objectName
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    steps.push(toStep(item, columns, indexes, steps.length + 1))
  }
  return steps
}

function toStep(
  item: TenantSchemaDiffItem,
  columns: Map<string, TenantColumnInspectionItem>,
  indexes: Map<string, TenantIndexInspectionItem[]>,
  order: number,
): TenantUpgradePlanStep {
  const base = { id: randomUUID(), objectName: item.objectName, objectType: item.objectType, order }
  if (item.status === "extra") {
    return { ...base, action: "remove", rationale: `${item.message} Removal can destroy tenant data and requires explicit review.`, risk: "destructive", statement: null, title: `Review extra ${item.objectType}` }
  }
  if (item.objectType === "table") {
    if (item.status === "changed" && item.expected) {
      return { ...base, action: "alter", rationale: item.message, risk: "caution", statement: `ALTER TABLE ${identifier(item.objectName)} ENGINE=${item.expected};`, title: "Align table engine" }
    }
    return { ...base, action: "create", rationale: `${item.message} Apply the owning backend migration so constraints and module setup are preserved.`, risk: "caution", statement: null, title: "Apply missing table migration" }
  }
  if (item.objectType === "column") {
    const column = columns.get(item.objectName)
    const tableName = item.objectName.slice(0, item.objectName.lastIndexOf("."))
    if (!column) return { ...base, action: "review", rationale: item.message, risk: "caution", statement: null, title: "Review column difference" }
    const verb = item.status === "missing" ? "ADD COLUMN" : "MODIFY COLUMN"
    return { ...base, action: "alter", rationale: item.message, risk: item.status === "missing" ? "safe" : "caution", statement: `ALTER TABLE ${identifier(tableName)} ${verb} ${columnDefinition(column)};`, title: item.status === "missing" ? "Add missing column" : "Align column definition" }
  }
  const indexKey = item.objectType === "primary-key" ? `${item.objectName}.PRIMARY` : item.objectName
  const index = indexes.get(indexKey)
  const separator = indexKey.lastIndexOf(".")
  const tableName = indexKey.slice(0, separator)
  const indexName = indexKey.slice(separator + 1)
  if (item.status === "missing" && index?.length) {
    const statement = indexName === "PRIMARY"
      ? `ALTER TABLE ${identifier(tableName)} ADD PRIMARY KEY (${index.map((part) => identifier(part.columnName)).join(", ")});`
      : `ALTER TABLE ${identifier(tableName)} ADD ${index[0]?.isUnique ? "UNIQUE " : ""}INDEX ${identifier(indexName)} (${index.map((part) => identifier(part.columnName)).join(", ")});`
    return { ...base, action: "alter", rationale: item.message, risk: "caution", statement, title: indexName === "PRIMARY" ? "Add primary key" : "Add missing index" }
  }
  return { ...base, action: "review", rationale: `${item.message} Replacing an existing index requires lock and workload review.`, risk: "caution", statement: null, title: "Review index definition" }
}

function columnDefinition(column: TenantColumnInspectionItem) {
  const nullable = column.isNullable ? "NULL" : "NOT NULL"
  const defaultValue = column.columnDefault === null ? "" : ` DEFAULT ${sqlDefault(column.columnDefault)}`
  const extra = column.extra ? ` ${column.extra.toUpperCase()}` : ""
  return `${identifier(column.columnName)} ${column.columnType} ${nullable}${defaultValue}${extra}`
}

function sqlDefault(value: string) {
  if (/^(null|current_timestamp(?:\(\))?|current_date(?:\(\))?)$/i.test(value) || /^-?\d+(?:\.\d+)?$/.test(value)) return value
  return `'${value.replaceAll("'", "''")}'`
}

function groupIndexes(indexes: TenantIndexInspectionItem[]) {
  const grouped = new Map<string, TenantIndexInspectionItem[]>()
  for (const index of indexes) {
    const key = `${index.tableName}.${index.indexName}`
    grouped.set(key, [...(grouped.get(key) ?? []), index].sort((left, right) => left.sequence - right.sequence))
  }
  return grouped
}

function compareDiffItems(left: TenantSchemaDiffItem, right: TenantSchemaDiffItem) {
  const severity = { critical: 0, warning: 1, info: 2 }
  return severity[left.severity] - severity[right.severity] || left.objectName.localeCompare(right.objectName)
}

function identifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}
