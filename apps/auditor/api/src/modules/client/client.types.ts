import type { ColumnType, Generated } from "kysely";

export type AuditorClientStatus = "active" | "inactive";

export type AuditorClientInput = {
  name: string;
  companyName: string | null;
  ownerName: string | null;
  mobile: string | null;
  email: string | null;
  gstin: string | null;
  status: AuditorClientStatus;
};

export type AuditorClientRecord = AuditorClientInput & {
  id: number;
  uuid: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditorClientRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  name: string;
  company_name: string | null;
  owner_name: string | null;
  mobile: string | null;
  email: string | null;
  gstin: string | null;
  status: AuditorClientStatus;
  created_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};

export type AuditorClientDatabase = {
  auditor_clients: AuditorClientRow;
  auditor_client_credentials: AuditorClientCredentialRow;
};

export const auditorCredentialPortals = ["gstin", "eway", "einvoice", "accounts"] as const;
export type AuditorCredentialPortal = (typeof auditorCredentialPortals)[number];

export type AuditorClientCredential = {
  portal: AuditorCredentialPortal;
  username: string | null;
  hasPassword: boolean;
  updatedAt: string | null;
};

export type AuditorClientCredentialRow = {
  id: Generated<number>;
  uuid: Generated<string>;
  client_id: number;
  portal: AuditorCredentialPortal;
  username: string;
  password_secret: string;
  status: "active";
  created_by: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
};
