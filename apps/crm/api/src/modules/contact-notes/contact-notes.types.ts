import type { ColumnType, Generated } from "kysely";

export type ContactNotesInput = {
  personId: number;
  noteType: string | null;
  body: string;
  isImportant: boolean;
};
export type ContactNotesRecord = ContactNotesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactNotesRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  note_type: string | null;
  body: string;
  is_important: number;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactNotesDatabase = { contact_notes: ContactNotesRow };
