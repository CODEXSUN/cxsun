import type { ColumnType, Generated } from "kysely";

export type ContactPersonTagsInput = {
  personId: number;
  tagId: number;
};
export type ContactPersonTagsRecord = ContactPersonTagsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactPersonTagsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  tag_id: number;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactPersonTagsDatabase = { contact_person_tags: ContactPersonTagsRow };
