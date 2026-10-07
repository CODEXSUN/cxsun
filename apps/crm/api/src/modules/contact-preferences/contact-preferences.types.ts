import type { ColumnType, Generated } from "kysely";

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
export type ContactPreferencesRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  person_id: number;
  preferred_channel: string | null;
  preferred_language: string | null;
  preferred_time: string | null;
  communication_frequency: string | null;
  communication_permission: string | null;
  status: "active" | "inactive";
  created_by: string;
  updated_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
export type ContactPreferencesDatabase = { contact_preferences: ContactPreferencesRow };
