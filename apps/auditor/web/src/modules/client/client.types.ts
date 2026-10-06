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
