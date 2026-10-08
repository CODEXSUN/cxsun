import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ZetroProviderRepository } from "./provider.repository.js";
import { saveSchema, settingsSchema } from "./provider.routes.js";
import { ZetroProviderService } from "./provider.service.js";
import type { ZetroProviderDatabase } from "./provider.types.js";
import type { ZetroProviderConfig } from "../chat/chat.types.js";

const tenantParams = z.object({ tenantId: z.string().min(1) }).strict();

export function registerZetroProviderAdminRoutes(
  app: FastifyInstance,
  context: (
    request: FastifyRequest,
    tenantId: string
  ) => Promise<{
    database: Kysely<ZetroProviderDatabase>;
    actorEmail: string;
    tenantId: string;
    audit: (action: "update" | "device-login" | "disconnect" | "bind-local") => Promise<void>;
  }>,
  fallback: ZetroProviderConfig,
  encryptionSecret: string
) {
  const service = async (request: FastifyRequest, tenantId: string) => {
    const scope = await context(request, tenantId);
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
    url: "/zetro/admin/tenants/:tenantId/provider",
    schemas: { params: tenantParams, response: settingsSchema },
    handler: async ({ params, request }) =>
      (await service(request, params.tenantId)).provider.settings()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/zetro/admin/tenants/:tenantId/provider",
    schemas: { params: tenantParams, body: saveSchema, response: settingsSchema },
    handler: async ({ params, body, request }) => {
      const { actorEmail, audit, provider } = await service(request, params.tenantId);
      const result = await provider.save(body, actorEmail);
      await audit("update");
      return result;
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/provider/models",
    schemas: { params: tenantParams, response: z.array(z.string()) },
    handler: async ({ params, request }) =>
      (await service(request, params.tenantId)).provider.models()
  });
}
