export type ZetroProviderKind = "openai" | "local" | "codex_cli";

export type ZetroProviderSettings = {
  source: "tenant" | "environment" | "unconfigured";
  provider: ZetroProviderKind;
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  updatedAt: string | null;
};

export type ZetroProviderSave = {
  provider: ZetroProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type ZetroCodexStatus = {
  installed: boolean;
  signedIn: boolean;
  accountEmail: string | null;
  connectionMethod: "device-code" | "local" | null;
  pending: boolean;
  code: string | null;
  verificationUrl: string;
  expiresAt: string | null;
};

export type ZetroLocalCodexStatus = {
  installed: boolean;
  signedIn: boolean;
  accountEmail: string | null;
  bindAvailable: boolean;
};
