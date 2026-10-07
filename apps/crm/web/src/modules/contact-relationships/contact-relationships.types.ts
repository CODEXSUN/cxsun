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
