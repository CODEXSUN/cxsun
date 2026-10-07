import type { ColumnType, Generated } from "kysely";

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
export type ContactPeopleRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  customer_contact_id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  salutation: string | null;
  profile_photo_ref: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactPeopleDatabase = { contact_people: ContactPeopleRow };
