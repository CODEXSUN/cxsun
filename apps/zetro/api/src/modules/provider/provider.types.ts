import type { ColumnType } from "kysely";

export type ZetroProviderKind = "openai" | "local" | "codex_cli";

export type ZetroProviderSettingsTable = {
  id: number;
  uuid: ColumnType<string, never, never>;
  provider: ZetroProviderKind;
  base_url: string;
  model: string;
  encrypted_api_key: string | null;
  status: ColumnType<string, never, never>;
  created_by: ColumnType<string, never, never>;
  updated_by: string;
  created_at: ColumnType<Date | string, never, never>;
  updated_at: ColumnType<Date | string, never, never>;
};

export type ZetroProviderDatabase = {
  zetro_provider_settings: ZetroProviderSettingsTable;
};

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
