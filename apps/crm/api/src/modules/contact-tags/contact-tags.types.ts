import type { ColumnType, Generated } from "kysely";

export type ContactTagsInput = {
  name: string;
  color: string | null;
};
export type ContactTagsRecord = ContactTagsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactTagsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  name: string;
  color: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactTagsDatabase = { contact_tags: ContactTagsRow };
