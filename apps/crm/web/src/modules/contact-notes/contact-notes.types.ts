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
