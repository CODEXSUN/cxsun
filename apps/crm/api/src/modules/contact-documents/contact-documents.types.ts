import type { ColumnType, Generated } from "kysely";

export type ContactDocumentsInput = {
  personId: number;
  documentType: string | null;
  documentName: string;
  description: string | null;
  documentDate: string | null;
  expiryDate: string | null;
  fileRef: string | null;
};
export type ContactDocumentsRecord = ContactDocumentsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactDocumentsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  document_type: string | null;
  document_name: string;
  description: string | null;
  document_date: string | null;
  expiry_date: string | null;
  file_ref: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactDocumentsDatabase = { contact_documents: ContactDocumentsRow };
