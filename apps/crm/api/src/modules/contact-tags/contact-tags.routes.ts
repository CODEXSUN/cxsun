import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactTagsRepository } from "./contact-tags.repository.js";
import { ContactTagsService } from "./contact-tags.service.js";
import type { ContactTagsDatabase } from "./contact-tags.types.js";

const path = "/crm/contact-tags";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  name: z.string().trim().min(1).max(191),
  color: z.string().trim().max(32).nullable()
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
export type ContactTagsRequestContext = {
  database: Kysely<ContactTagsDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
};
export function registerContactTagsRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactTagsRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactTagsService(new ContactTagsRepository(scope.database), scope.parentExists)
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: z.object({}), response: z.array(recordSchema) },
    handler: async ({ request }) => (await scoped(request)).service.list()
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
