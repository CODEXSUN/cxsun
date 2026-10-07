import type { ColumnType, Generated } from "kysely";

export type ContactRelationshipsInput = {
  customerContactId: number;
  personAId: number;
  personBId: number;
  relationshipType: string;
  relationshipStrength: string | null;
  notes: string | null;
};
export type ContactRelationshipsRecord = ContactRelationshipsInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ContactRelationshipsRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  customer_contact_id: number;
  person_a_id: number;
  person_b_id: number;
  relationship_type: string;
  relationship_strength: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactRelationshipsDatabase = { contact_relationships: ContactRelationshipsRow };
