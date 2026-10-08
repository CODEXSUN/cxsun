import { z } from "zod";
import { AppError } from "@cxsun/framework/errors";
import { ZetroProviderRepository } from "./provider.repository.js";
import type { ZetroProviderSave } from "./provider.types.js";
import { codexCliStatus, disconnectCodexCli, startCodexDeviceLogin } from "./provider.codex-cli.js";
import { bindLocalCodex, localCodexStatus } from "./provider.codex-local.js";

const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) }))
});

export class ZetroProviderService {
  constructor(
    private readonly repository: ZetroProviderRepository,
    private readonly tenantId: string
  ) {}

  settings() {
    return this.repository.settings();
  }

  async save(input: ZetroProviderSave, actorEmail: string) {
    const baseUrl =
      input.provider === "codex_cli" ? "" : validateBaseUrl(input.provider, input.baseUrl);
    const model = input.model.trim();
    if (input.provider === "codex_cli") {
      if (input.baseUrl.trim() || input.apiKey.trim()) {
        throw AppError.validation(
          "Codex CLI uses the API host's own sign-in, not an API URL or key."
        );
      }
      const status = await codexCliStatus(this.tenantId);
      if (!status.installed || !status.signedIn) {
        throw AppError.validation(
          "Codex CLI must be installed and signed in on the Platform API host."
        );
      }
    }
    if (input.provider === "openai" && !input.apiKey.trim()) {
      const current = await this.repository.settings();
      if (
        current.source !== "tenant" ||
        current.provider !== "openai" ||
        !current.apiKeyConfigured
      ) {
        throw AppError.validation("An OpenAI API key is required.");
      }
    }
    const saved = await this.repository.save(
      { ...input, baseUrl, model, apiKey: input.apiKey.trim() },
      actorEmail
    );
    return saved;
  }

  async models() {
    const provider = await this.repository.resolve();
    if (provider.kind === "codex_cli") {
      throw AppError.validation(
        "Enter a Codex model ID, or leave it blank to use the CLI default."
      );
    }
    const baseUrl = validateBaseUrl(provider.kind ?? "openai", provider.baseUrl);
    if (!provider.apiKey && provider.kind !== "local") {
      throw AppError.validation("Save an OpenAI API key before loading models.");
    }
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/models`, {
        headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
        redirect: "error",
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw AppError.validation("Zetro could not reach the provider.");
    }
    if (!response.ok) throw AppError.validation("The provider rejected the connection.");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw AppError.validation("The provider returned an invalid model list.");
    }
    const parsed = modelListSchema.safeParse(payload);
    if (!parsed.success) throw AppError.validation("The provider returned an invalid model list.");
    return [...new Set(parsed.data.data.map((item) => item.id))].sort().slice(0, 500);
  }

  codexStatus() {
    return codexCliStatus(this.tenantId);
  }

  startCodexLogin() {
    return startCodexDeviceLogin(this.tenantId);
  }

  disconnectCodex() {
    return disconnectCodexCli(this.tenantId);
  }

  localCodexStatus() {
    return localCodexStatus();
  }

  bindLocalCodex() {
    return bindLocalCodex(this.tenantId);
  }
}

function validateBaseUrl(provider: "openai" | "local", value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw AppError.validation("Enter a valid provider URL.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw AppError.validation("Provider URL cannot contain credentials, query, or fragment.");
  }
  if (provider === "openai") {
    if (url.origin !== "https://api.openai.com" || url.pathname !== "/v1") {
      throw AppError.validation("OpenAI connections use https://api.openai.com/v1.");
    }
  } else if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/v1"
  ) {
    throw AppError.validation(
      "Local connections must use a loopback /v1 endpoint on the API host."
    );
  }
  return url.toString().replace(/\/$/u, "");
}
