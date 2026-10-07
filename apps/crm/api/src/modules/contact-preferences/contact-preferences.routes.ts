import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactPreferencesRepository } from "./contact-preferences.repository.js";
import { ContactPreferencesService } from "./contact-preferences.service.js";
import type { ContactPreferencesDatabase } from "./contact-preferences.types.js";

const path = "/crm/contact-preferences";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  personId: z.number().int().positive(),
  preferredChannel: z.string().trim().max(191).nullable(),
  preferredLanguage: z.string().trim().max(191).nullable(),
  preferredTime: z.string().trim().max(191).nullable(),
  communicationFrequency: z.string().trim().max(191).nullable(),
  communicationPermission: z.string().trim().max(191).nullable()
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
export type ContactPreferencesRequestContext = {
  database: Kysely<ContactPreferencesDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
};
export function registerContactPreferencesRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactPreferencesRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactPreferencesService(
        new ContactPreferencesRepository(scope.database),
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
