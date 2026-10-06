import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { AuditorClientRepository } from "./client.repository.js";
import { AuditorClientService } from "./client.service.js";
import type { AuditorClientDatabase, AuditorClientRecord } from "./client.types.js";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(191),
  companyName: z.string().trim().max(191).nullable(),
  ownerName: z.string().trim().max(191).nullable(),
  mobile: z.string().trim().max(80).nullable(),
  email: z.email().max(191).nullable(),
  gstin: z.string().trim().max(15).nullable(),
  status: z.enum(["active", "inactive"])
});
const recordSchema = inputSchema.extend({
  id: z.number().int().positive(),
  uuid: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const idSchema = z.object({ id: z.coerce.number().int().positive() });

export type AuditorClientRequestContext = {
  database: Kysely<AuditorClientDatabase>;
  actorEmail: string;
  authorize: (
    permission: "auditor.client.view" | "auditor.client.create" | "auditor.client.update"
  ) => Promise<void>;
  audit: (action: "created" | "updated", record: AuditorClientRecord) => Promise<void>;
};

export function registerAuditorClientRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<AuditorClientRequestContext>
) {
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    await scope.authorize(
      request.method === "GET"
        ? "auditor.client.view"
        : request.method === "POST"
          ? "auditor.client.create"
          : "auditor.client.update"
    );
    return {
      scope,
      clients: new AuditorClientService(new AuditorClientRepository(scope.database))
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: "/auditor/clients",
    schemas: {
      querystring: z.object({ search: z.string().trim().max(191).optional() }),
      response: z.array(recordSchema)
    },
    handler: async ({ query, request }) => (await service(request)).clients.list(query.search)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/auditor/clients/:id",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => (await service(request)).clients.get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/auditor/clients",
    schemas: { body: inputSchema, response: recordSchema },
    handler: async ({ body, request }) => {
      const { scope, clients } = await service(request);
      const record = await clients.create(body, scope.actorEmail);
      await scope.audit("created", record);
      return record;
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/auditor/clients/:id",
    schemas: { body: inputSchema, params: idSchema, response: recordSchema },
    handler: async ({ body, params, request }) => {
      const { scope, clients } = await service(request);
      const record = await clients.update(params.id, body);
      await scope.audit("updated", record);
      return record;
    }
  });
}
