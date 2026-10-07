import type { ColumnType, Generated } from "kysely";

export type ContactRolesInput = {
  personId: number;
  roleName: string;
  isPrimaryRole: boolean;
  decisionAuthority: string | null;
  influenceLevel: string | null;
};
export type ContactRolesRecord = ContactRolesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactRolesRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  role_name: string;
  is_primary_role: number;
  decision_authority: string | null;
  influence_level: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactRolesDatabase = { contact_roles: ContactRolesRow };
