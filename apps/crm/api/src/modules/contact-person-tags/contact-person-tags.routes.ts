import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactPersonTagsRepository } from "./contact-person-tags.repository.js";
import { ContactPersonTagsService } from "./contact-person-tags.service.js";
import type { ContactPersonTagsDatabase } from "./contact-person-tags.types.js";

const path = "/crm/contact-person-tags";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  personId: z.number().int().positive(),
  tagId: z.number().int().positive()
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
export type ContactPersonTagsRequestContext = {
  database: Kysely<ContactPersonTagsDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
  tagExists: (id: number) => Promise<boolean>;
};
export function registerContactPersonTagsRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactPersonTagsRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactPersonTagsService(
        new ContactPersonTagsRepository(scope.database),
        scope.parentExists,
        scope.tagExists
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
