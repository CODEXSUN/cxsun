import assert from "node:assert/strict";
import test from "node:test";
import { ZetroProviderService } from "./provider.service.js";
import type { ZetroProviderRepository } from "./provider.repository.js";
import type { ZetroProviderSettings } from "./provider.types.js";

const existing: ZetroProviderSettings = {
  source: "tenant",
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKeyConfigured: true,
  updatedAt: null
};

test("requires a tenant key before creating an OpenAI connection", async () => {
  let saved = false;
  const repository = {
    settings: async () => ({ ...existing, source: "environment" }),
    save: async () => {
      saved = true;
      return existing;
    }
  } as unknown as ZetroProviderRepository;
  const service = new ZetroProviderService(repository, "00000000-0000-0000-0000-000000000001");
  await assert.rejects(
    service.save({ provider: "openai", baseUrl: existing.baseUrl, model: "", apiKey: "" }, "admin"),
    /OpenAI API key is required/u
  );
  assert.equal(saved, false);
});

test("rejects non-loopback local endpoints before saving credentials", async () => {
  let saved = false;
  const repository = {
    save: async () => {
      saved = true;
      return existing;
    }
  } as unknown as ZetroProviderRepository;
  const service = new ZetroProviderService(repository, "00000000-0000-0000-0000-000000000001");
  await assert.rejects(
    service.save(
      { provider: "local", baseUrl: "https://other.example/v1", model: "test", apiKey: "secret" },
      "admin"
    ),
    /loopback/u
  );
  assert.equal(saved, false);
});
