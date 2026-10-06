import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ListInRepository } from "./list-in.repository.js";
import { ListInService } from "./list-in.service.js";
import type { ListInDatabase } from "./list-in.types.js";

const path = "/crm/list-in";
const id = z.object({ id: z.coerce.number().int().positive() });
const input = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1000000)
});
const record = input.extend({
  id: z.number().int().positive(),
  uuid: z.string(),
  status: z.enum(["active", "inactive"]),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ListInRequestContext = {
  database: Kysely<ListInDatabase>;
  actorEmail: string;
};
export function registerListInRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ListInRequestContext>
) {
  const service = async (request: FastifyRequest) =>
    new ListInService(new ListInRepository((await context(request)).database));
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
      return new ListInService(new ListInRepository(scope.database)).create(body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: path + "/:id",
    schemas: { params: id, body: input, response: record },
    handler: async ({ params, body, request }) => {
      const scope = await context(request);
      return new ListInService(new ListInRepository(scope.database)).update(
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
      return new ListInService(new ListInRepository(scope.database)).setActive(
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
      return new ListInService(new ListInRepository(scope.database)).setActive(
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
