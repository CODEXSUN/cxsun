export type ContactPeopleInput = {
  customerContactId: number;
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  salutation: string | null;
  profilePhotoRef: string | null;
};

export type ContactPeopleRecord = ContactPeopleInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
