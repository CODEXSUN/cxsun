import type { ColumnType, Generated } from "kysely";

export type StatusInput = { name: string; sortOrder: number };
export type StatusRecord = StatusInput & {
  id: number;
  uuid: string;
  code: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type StatusRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  code: string;
  name: string;
  status: "active" | "inactive";
  sort_order: number;
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type StatusDatabase = { crm_enquiry_statuses: StatusRow };
