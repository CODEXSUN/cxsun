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
