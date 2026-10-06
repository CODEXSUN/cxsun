import type { ColumnType, Generated } from "kysely";

export type ListInInput = { name: string; sortOrder: number };
export type ListInRecord = ListInInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ListInRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  name: string;
  status: "active" | "inactive";
  sort_order: number;
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ListInDatabase = { crm_enquiry_lists: ListInRow };
