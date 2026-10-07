export type ContactProfilesInput = {
  coreContactId: number;
  displayName: string | null;
  customerKind: string | null;
  industryId: number | null;
  businessType: string | null;
  customerSince: string | null;
};

export type ContactProfilesRecord = ContactProfilesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
