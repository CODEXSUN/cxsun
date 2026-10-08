import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ZetroProviderRepository } from "./provider.repository.js";
import { ZetroProviderService } from "./provider.service.js";
import type { ZetroProviderDatabase } from "./provider.types.js";
import type { ZetroProviderConfig } from "../chat/chat.types.js";

export const settingsSchema = z.object({
  source: z.enum(["tenant", "environment", "unconfigured"]),
  provider: z.enum(["openai", "local", "codex_cli"]),
  baseUrl: z.string(),
  model: z.string(),
  apiKeyConfigured: z.boolean(),
  updatedAt: z.string().nullable()
});
export const saveSchema = z
  .object({
    provider: z.enum(["openai", "local", "codex_cli"]),
    baseUrl: z.string().trim().max(2048),
    model: z.string().trim().max(191),
    apiKey: z.string().max(2048)
  })
  .strict();
export const codexStatusSchema = z.object({
  installed: z.boolean(),
  signedIn: z.boolean(),
  accountEmail: z.string().nullable(),
  connectionMethod: z.enum(["device-code", "local"]).nullable(),
  pending: z.boolean(),
  code: z.string().nullable(),
  verificationUrl: z.string(),
  expiresAt: z.string().nullable()
});
export const localCodexStatusSchema = z.object({
  installed: z.boolean(),
  signedIn: z.boolean(),
  accountEmail: z.string().nullable(),
  bindAvailable: z.boolean()
});

export type ZetroProviderContext = {
  database: Kysely<ZetroProviderDatabase>;
  actorEmail: string;
  tenantId: string;
  audit: (action: "update" | "device-login" | "disconnect" | "bind-local") => Promise<void>;
};

export function registerZetroProviderRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ZetroProviderContext>,
  fallback: ZetroProviderConfig,
  encryptionSecret: string
) {
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      actorEmail: scope.actorEmail,
      audit: scope.audit,
      provider: new ZetroProviderService(
        new ZetroProviderRepository(scope.database, encryptionSecret, scope.tenantId, fallback),
        scope.tenantId
      )
    };
  };

  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/provider",
    schemas: { response: settingsSchema },
    handler: async ({ request }) => (await service(request)).provider.settings()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/zetro/provider",
    schemas: { body: saveSchema, response: settingsSchema },
    handler: async ({ body, request }) => {
      const { actorEmail, audit, provider } = await service(request);
      const result = await provider.save(body, actorEmail);
      await audit("update");
      return result;
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/provider/models",
    schemas: { response: z.array(z.string()) },
    handler: async ({ request }) => (await service(request)).provider.models()
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/provider/codex/status",
    schemas: { response: codexStatusSchema },
    handler: async ({ request }) => (await service(request)).provider.codexStatus()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/provider/codex/device-login",
    schemas: { response: codexStatusSchema },
    handler: async ({ request }) => {
      const { audit, provider } = await service(request);
      await audit("device-login");
      return provider.startCodexLogin();
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/provider/codex/disconnect",
    schemas: { response: codexStatusSchema },
    handler: async ({ request }) => {
      const { audit, provider } = await service(request);
      const result = await provider.disconnectCodex();
      await audit("disconnect");
      return result;
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/provider/codex/local-status",
    schemas: { response: localCodexStatusSchema },
    handler: async ({ request }) => (await service(request)).provider.localCodexStatus()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/provider/codex/bind-local",
    schemas: { response: codexStatusSchema },
    handler: async ({ request }) => {
      const { audit, provider } = await service(request);
      const result = await provider.bindLocalCodex();
      await audit("bind-local");
      return result;
    }
  });
}
