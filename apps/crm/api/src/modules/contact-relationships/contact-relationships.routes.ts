import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ContactRelationshipsRepository } from "./contact-relationships.repository.js";
import { ContactRelationshipsService } from "./contact-relationships.service.js";
import type { ContactRelationshipsDatabase } from "./contact-relationships.types.js";

const path = "/crm/contact-relationships";
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const inputSchema = z.object({
  customerContactId: z.number().int().positive(),
  personAId: z.number().int().positive(),
  personBId: z.number().int().positive(),
  relationshipType: z.string().trim().min(1).max(191),
  relationshipStrength: z.string().trim().max(191).nullable(),
  notes: z.string().trim().max(1000).nullable()
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
export type ContactRelationshipsRequestContext = {
  database: Kysely<ContactRelationshipsDatabase>;
  actorEmail: string;
  parentExists: (id: number) => Promise<boolean>;
  personCustomer: (id: number) => Promise<number | null>;
};
export function registerContactRelationshipsRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ContactRelationshipsRequestContext>
) {
  const scoped = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      service: new ContactRelationshipsService(
        new ContactRelationshipsRepository(scope.database),
        scope.parentExists,
        scope.personCustomer
      )
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: {
      querystring: z.object({ customerContactId: z.coerce.number().int().positive() }),
      response: z.array(recordSchema)
    },
    handler: async ({ query, request }) =>
      (await scoped(request)).service.list(query.customerContactId)
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
