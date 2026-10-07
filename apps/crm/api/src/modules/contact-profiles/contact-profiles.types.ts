import type { ColumnType, Generated } from "kysely";

export type ContactProfilesInput = {
  coreContactId: number;
  displayName: string | null;
  customerKind: string | null;
  industryId: number | null;
  businessType: string | null;
  customerSince: string | null;
};
export type ContactProfilesRecord = ContactProfilesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactProfilesRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  core_contact_id: number;
  display_name: string | null;
  customer_kind: string | null;
  industry_id: number | null;
  business_type: string | null;
  customer_since: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactProfilesDatabase = { contact_profiles: ContactProfilesRow };
