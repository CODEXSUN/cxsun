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
export type CaseKind = (typeof caseKinds)[number];
export type CaseSeverity = (typeof caseSeverities)[number];
export type CaseStatus =
  "open" | "proposal_ready" | "approved" | "executing" | "executed" | "completed" | "cancelled";
export type TextCorrectionPlan = {
  table: string;
  column: string;
  rowId: number;
  expectedValue: string;
  replacementValue: string;
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
export type ZunoCaseInput = Pick<
  ZunoCase,
  "kind" | "severity" | "tenantId" | "title" | "description"
>;
export type ZunoCaseDetail = {
  record: ZunoCase;
  activity: Array<{ action: string; detail: string; actorEmail: string; createdAt: string }>;
};
export type TenantTarget = { id: number; label: string };
