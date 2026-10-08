export type FrappeConnection = {
  source: "tenant" | "environment";
  configured: boolean;
  enabled: boolean;
  baseUrl: string | null;
  connectionName: string;
  appKeyConfigured: boolean;
  appSecretConfigured: boolean;
  verificationStatus: "unverified" | "verified" | "failed";
  lastCheckedAt: string | null;
  lastVerifiedAt: string | null;
};

export type FrappeConnectionInput = {
  connectionName: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
};
