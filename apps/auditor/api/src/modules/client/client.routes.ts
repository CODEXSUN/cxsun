import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { AuditorClientRepository } from "./client.repository.js";
import { AuditorClientService } from "./client.service.js";
import { auditorCredentialPortals } from "./client.types.js";
import type {
  AuditorClientDatabase,
  AuditorClientRecord,
  AuditorCredentialPortal
} from "./client.types.js";

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
const credentialParamsSchema = idSchema.extend({ portal: z.enum(auditorCredentialPortals) });
const credentialInputSchema = z.object({
  username: z.string().trim().min(1).max(191),
  password: z.string().min(1).max(2048).optional()
});
const credentialSchema = z.object({
  portal: z.enum(auditorCredentialPortals),
  username: z.string().nullable(),
  hasPassword: z.boolean(),
  updatedAt: z.string().nullable()
});

export type AuditorClientRequestContext = {
  database: Kysely<AuditorClientDatabase>;
  actorEmail: string;
  secretKey: string;
  authorize: (
    permission:
      | "auditor.client.view"
      | "auditor.client.create"
      | "auditor.client.update"
      | "auditor.client.credentials.view"
      | "auditor.client.credentials.update"
      | "auditor.client.credentials.reveal"
  ) => Promise<void>;
  audit: (action: "created" | "updated", record: AuditorClientRecord) => Promise<void>;
  auditCredential: (
    action: "updated" | "revealed",
    clientId: number,
    portal: AuditorCredentialPortal
  ) => Promise<void>;
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
      clients: new AuditorClientService(
        new AuditorClientRepository(scope.database),
        scope.secretKey
      )
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
    method: "GET",
    url: "/auditor/clients/:id/credentials",
    schemas: { params: idSchema, response: z.array(credentialSchema) },
    handler: async ({ params, request, reply }) => {
      const { scope, clients } = await service(request);
      await scope.authorize("auditor.client.credentials.view");
      reply.header("cache-control", "no-store");
      return clients.listCredentials(params.id);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/auditor/clients/:id/credentials/:portal",
    schemas: {
      body: credentialInputSchema,
      params: credentialParamsSchema,
      response: credentialSchema
    },
    handler: async ({ body, params, request, reply }) => {
      const { scope, clients } = await service(request);
      await scope.authorize("auditor.client.credentials.update");
      const saved = await clients.saveCredential(params.id, params.portal, body, scope.actorEmail);
      await scope.auditCredential("updated", params.id, params.portal);
      reply.header("cache-control", "no-store");
      return saved;
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/auditor/clients/:id/credentials/:portal/password",
    schemas: { params: credentialParamsSchema, response: z.object({ password: z.string() }) },
    handler: async ({ params, request, reply }) => {
      const { scope, clients } = await service(request);
      await scope.authorize("auditor.client.credentials.reveal");
      const result = await clients.revealCredential(params.id, params.portal);
      await scope.auditCredential("revealed", params.id, params.portal);
      reply.header("cache-control", "no-store");
      return result;
    }
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
