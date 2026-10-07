export type ContactPreferencesInput = {
  personId: number;
  preferredChannel: string | null;
  preferredLanguage: string | null;
  preferredTime: string | null;
  communicationFrequency: string | null;
  communicationPermission: string | null;
};

export type ContactPreferencesRecord = ContactPreferencesInput & {
  id: number;
  uuid: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
