import type { ColumnType, Generated } from "kysely";

export type ContactClassificationsInput = {
  personId: number;
  category: string | null;
  priorityLevel: string | null;
  isVip: boolean;
  isPrimaryContact: boolean;
};
export type ContactClassificationsRecord = ContactClassificationsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactClassificationsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  category: string | null;
  priority_level: string | null;
  is_vip: number;
  is_primary_contact: number;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactClassificationsDatabase = { contact_classifications: ContactClassificationsRow };
