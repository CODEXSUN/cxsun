import type { ColumnType, Generated } from "kysely";

export type ContactCommunicationInput = {
  personId: number;
  kind: string;
  value: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
};
export type ContactCommunicationRecord = ContactCommunicationInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactCommunicationRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  kind: string;
  value: string;
  is_primary: number;
  is_whatsapp: number;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactCommunicationDatabase = { contact_communication: ContactCommunicationRow };
