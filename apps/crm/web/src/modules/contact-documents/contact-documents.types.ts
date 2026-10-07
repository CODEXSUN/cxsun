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
