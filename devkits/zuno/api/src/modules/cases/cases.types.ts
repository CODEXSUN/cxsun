import type { ColumnType, Generated, Kysely } from "kysely";
import type { ZunoThreadTable, ZunoMessageTable } from "../conversations/conversations.types.js";

export const caseKinds = [
  "incident",
  "performance",
  "backup",
  "data_correction",
  "schema_change",
  "code_change",
  "other"
] as const;
export const caseSeverities = ["low", "medium", "high", "critical"] as const;
export const caseStatuses = [
  "open",
  "proposal_ready",
  "approved",
  "executing",
  "executed",
  "completed",
  "cancelled"
] as const;

export type CaseKind = (typeof caseKinds)[number];
export type CaseSeverity = (typeof caseSeverities)[number];
export type CaseStatus = (typeof caseStatuses)[number];
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string | undefined>;

export type ZunoCaseTable = {
  id: Generated<number>;
  uuid: string;
  kind: CaseKind;
  severity: CaseSeverity;
  status: CaseStatus;
  tenant_id: number | null;
  title: string;
  description: string;
  proposal: string;
  sql_plan: string;
  verification: string;
  created_by: string;
  updated_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ZunoCaseActivityTable = {
  id: Generated<number>;
  uuid: string;
  case_uuid: string;
  action: string;
  detail: string;
  actor_email: string;
  status: "active";
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ZunoDatabase = {
  zuno_cases: ZunoCaseTable;
  zuno_case_activity: ZunoCaseActivityTable;
  zuno_threads: ZunoThreadTable;
  zuno_messages: ZunoMessageTable;
};

export type ZunoCase = {
  uuid: string;
  kind: CaseKind;
  severity: CaseSeverity;
  status: CaseStatus;
  tenantId: number | null;
  title: string;
  description: string;
  proposal: string;
  sqlPlan: TextCorrectionPlan | null;
  verification: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ZunoCaseActivity = {
  action: string;
  detail: string;
  actorEmail: string;
  createdAt: string;
};

export type ZunoCaseInput = Pick<
  ZunoCase,
  "kind" | "severity" | "tenantId" | "title" | "description"
>;
export type TextCorrectionPlan = {
  table: string;
  column: string;
  rowId: number;
  expectedValue: string;
  replacementValue: string;
};
export type ZunoCaseContext = {
  actorEmail: string;
  database: Kysely<ZunoDatabase>;
  tenantExists(tenantId: number): Promise<boolean>;
  listTenantTargets(): Promise<Array<{ id: number; label: string }>>;
  previewTextCorrection(
    tenantId: number,
    plan: TextCorrectionPlan
  ): Promise<{ currentValue: string | null; sql: string }>;
  executeTextCorrection(
    tenantId: number,
    plan: TextCorrectionPlan
  ): Promise<{ backupRunId: number; sql: string }>;
};
