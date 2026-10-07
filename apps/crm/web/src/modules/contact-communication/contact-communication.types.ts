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
