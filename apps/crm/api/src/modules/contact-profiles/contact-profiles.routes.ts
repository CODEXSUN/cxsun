import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactProfilesRepository } from "./contact-profiles.repository.js";
import { ContactProfilesService } from "./contact-profiles.service.js";
import type { ContactProfilesDatabase } from "./contact-profiles.types.js";

const path = "/crm/contact-profiles";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  coreContactId: z.number().int().positive(),
  displayName: z.string().trim().max(191).nullable(),
  customerKind: z.string().trim().max(191).nullable(),
  industryId: z.number().int().positive().nullable(),
  businessType: z.string().trim().max(191).nullable(),
  customerSince: z.iso.date().nullable()
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
export type ContactProfilesRequestContext = {
  database: Kysely<ContactProfilesDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
  industryExists: (id: number) => Promise<boolean>;
};
export function registerContactProfilesRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactProfilesRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactProfilesService(
        new ContactProfilesRepository(scope.database),
        scope.parentExists,
        scope.industryExists
      )
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: {
      querystring: z.object({ coreContactId: z.coerce.number().int().positive() }),
      response: z.array(recordSchema)
    },
    handler: async ({ query, request }) => (await scoped(request)).service.list(query.coreContactId)
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
