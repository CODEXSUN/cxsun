export type AuditorClientStatus = "active" | "inactive";

export type AuditorClientSavePayload = {
  name: string;
  companyName: string | null;
  ownerName: string | null;
  mobile: string | null;
  email: string | null;
  gstin: string | null;
  status: AuditorClientStatus;
};

export type AuditorClientRecord = AuditorClientSavePayload & {
  id: number;
  uuid: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditorCredentialPortal = "gstin" | "eway" | "einvoice" | "accounts";

export type AuditorClientCredential = {
  portal: AuditorCredentialPortal;
  username: string | null;
  hasPassword: boolean;
  updatedAt: string | null;
};

export type AuditorCredentialSavePayload = {
  username: string;
  password?: string | undefined;
};
