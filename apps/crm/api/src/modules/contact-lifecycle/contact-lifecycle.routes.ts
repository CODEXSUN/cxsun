import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactLifecycleRepository } from "./contact-lifecycle.repository.js";
import { ContactLifecycleService } from "./contact-lifecycle.service.js";
import type { ContactLifecycleDatabase } from "./contact-lifecycle.types.js";

const path = "/crm/contact-lifecycle";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  personId: z.number().int().positive(),
  previousStatus: z.string().trim().max(191).nullable(),
  newStatus: z.string().trim().min(1).max(191),
  reason: z.string().trim().max(1000).nullable(),
  effectiveAt: z.iso.date().nullable()
});
const recordSchema = inputSchema.extend({
  id: z.number().int().positive(),
  uuid: z.string(),
  status: z.enum(["active", "inactive"]),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ContactLifecycleRequestContext = {
  database: Kysely<ContactLifecycleDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
};
export function registerContactLifecycleRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactLifecycleRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactLifecycleService(
        new ContactLifecycleRepository(scope.database),
        scope.parentExists
      )
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: {
      querystring: z.object({ personId: z.coerce.number().int().positive() }),
      response: z.array(recordSchema)
    },
    handler: async ({ query, request }) => (await scoped(request)).service.list(query.personId)
  });
  registerContractRoute(app, {
    method: "GET",
    url: path + "/:id",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => (await scoped(request)).service.get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: inputSchema, response: recordSchema },
    handler: async ({ body, request }) => {
      const { scope, service } = await scoped(request);
      return service.create(body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: path + "/:id",
    schemas: { params: idSchema, body: inputSchema, response: recordSchema },
    handler: async ({ params, body, request }) => {
      const { scope, service } = await scoped(request);
      return service.update(params.id, body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path + "/:id/activate",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => {
      const { scope, service } = await scoped(request);
      return service.setActive(params.id, true, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path + "/:id/deactivate",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => {
      const { scope, service } = await scoped(request);
      return service.setActive(params.id, false, scope.actorEmail);
    }
  });
}
