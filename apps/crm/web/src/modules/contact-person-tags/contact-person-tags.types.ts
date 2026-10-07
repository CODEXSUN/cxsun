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
