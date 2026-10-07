import type { ColumnType, Generated } from "kysely";

export type ContactLifecycleInput = {
  personId: number;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  effectiveAt: string | null;
};
export type ContactLifecycleRecord = ContactLifecycleInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactLifecycleRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  effective_at: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactLifecycleDatabase = { contact_lifecycle: ContactLifecycleRow };
