import type { Kysely } from "kysely";
import { decryptZetroApiKey, encryptZetroApiKey } from "./provider.secrets.js";
import type {
  ZetroProviderDatabase,
  ZetroProviderSave,
  ZetroProviderSettings
} from "./provider.types.js";
import type { ZetroProviderConfig } from "../chat/chat.types.js";

export class ZetroProviderRepository {
  constructor(
    private readonly database: Kysely<ZetroProviderDatabase>,
    private readonly secret: string,
    private readonly tenantId: string,
    private readonly fallback: ZetroProviderConfig
  ) {}

  async settings(): Promise<ZetroProviderSettings> {
    const row = await this.row();
    if (row) {
      return {
        source: "tenant",
        provider: row.provider,
        baseUrl: row.base_url,
        model: row.model,
        apiKeyConfigured: Boolean(row.encrypted_api_key),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    }
    return {
      source: this.fallback.apiKey && this.fallback.model ? "environment" : "unconfigured",
      provider: this.fallback.kind ?? "openai",
      baseUrl: this.fallback.baseUrl || "https://api.openai.com/v1",
      model: this.fallback.model,
      apiKeyConfigured: Boolean(this.fallback.apiKey),
      updatedAt: null
    };
  }

  async resolve(): Promise<ZetroProviderConfig> {
    const row = await this.row();
    if (!row) return this.fallback;
    return {
      apiKey: row.encrypted_api_key
        ? decryptZetroApiKey(row.encrypted_api_key, this.secret, this.tenantId)
        : "",
      baseUrl: row.base_url,
      kind: row.provider,
      model: row.model,
      tenantId: this.tenantId
    };
  }

  async save(input: ZetroProviderSave, actorEmail: string) {
    const existing = await this.row();
    const priorKey = existing?.provider === input.provider ? existing.encrypted_api_key : null;
    const encryptedKey = input.apiKey
      ? encryptZetroApiKey(input.apiKey, this.secret, this.tenantId)
      : priorKey;
    await this.database
      .insertInto("zetro_provider_settings")
      .values({
        id: 1,
        provider: input.provider,
        base_url: input.baseUrl,
        model: input.model,
        encrypted_api_key: encryptedKey,
        updated_by: actorEmail
      })
      .onDuplicateKeyUpdate({
        provider: input.provider,
        base_url: input.baseUrl,
        model: input.model,
        encrypted_api_key: encryptedKey,
        updated_by: actorEmail
      })
      .execute();
    return this.settings();
  }

  private row() {
    return this.database
      .selectFrom("zetro_provider_settings")
      .selectAll()
      .where("id", "=", 1)
      .executeTakeFirst();
  }
}
