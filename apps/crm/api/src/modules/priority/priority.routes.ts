import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { PriorityRepository } from "./priority.repository.js";
import { PriorityService } from "./priority.service.js";
import type { PriorityDatabase } from "./priority.types.js";

const path = "/crm/priorities";
const id = z.object({ id: z.coerce.number().int().positive() });
const input = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1000000)
});
const record = input.extend({
  id: z.number().int().positive(),
  uuid: z.string(),
  code: z.string(),
  status: z.enum(["active", "inactive"]),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PriorityRequestContext = {
  database: Kysely<PriorityDatabase>;
  actorEmail: string;
};
export function registerPriorityRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<PriorityRequestContext>
) {
  const service = async (request: FastifyRequest) =>
    new PriorityService(new PriorityRepository((await context(request)).database));
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { response: z.array(record) },
    handler: async ({ request }) => (await service(request)).list()
  });
  registerContractRoute(app, {
    method: "GET",
    url: path + "/:id",
    schemas: { params: id, response: record },
    handler: async ({ params, request }) => (await service(request)).get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: input, response: record },
    handler: async ({ body, request }) => {
      const scope = await context(request);
      return new PriorityService(new PriorityRepository(scope.database)).create(
        body,
        scope.actorEmail
      );
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: path + "/:id",
    schemas: { params: id, body: input, response: record },
    handler: async ({ params, body, request }) => {
      const scope = await context(request);
      return new PriorityService(new PriorityRepository(scope.database)).update(
        params.id,
        body,
        scope.actorEmail
      );
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path + "/:id/activate",
    schemas: { params: id, response: record },
    handler: async ({ params, request }) => {
      const scope = await context(request);
      return new PriorityService(new PriorityRepository(scope.database)).setActive(
        params.id,
        true,
        scope.actorEmail
      );
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path + "/:id/deactivate",
    schemas: { params: id, response: record },
    handler: async ({ params, request }) => {
      const scope = await context(request);
      return new PriorityService(new PriorityRepository(scope.database)).setActive(
        params.id,
        false,
        scope.actorEmail
      );
    }
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: path + "/:id/force",
    schemas: { params: id, response: record },
    handler: async ({ params, request }) => (await service(request)).forceDelete(params.id)
  });
}
