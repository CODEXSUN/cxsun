import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { requireProjectManagerActor } from "../../request-context.js";
import { IdeasService } from "./ideas.service.js";
import { ideaCategories, ideaStatuses } from "./ideas.types.js";

const path = "/admin/ideas";
const statusSchema = z.enum(ideaStatuses);
const categorySchema = z.enum(ideaCategories);
const saveSchema = z
  .object({
    assignee: z.string().trim().max(191),
    category: categorySchema,
    content: z.string().max(1_000_000),
    status: statusSchema,
    title: z.string().trim().min(1).max(255)
  })
  .strict();
const recordSchema = saveSchema.extend({
  createdAt: z.string(),
  createdBy: z.string(),
  id: z.number(),
  updatedAt: z.string(),
  uuid: z.string().length(8)
});
const paramsSchema = z.object({ uuid: z.string().regex(/^[a-f0-9]{8}$/u) }).strict();
const service = new IdeasService();

export async function registerIdeasRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { response: z.array(recordSchema) },
    handler: () => service.list()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:uuid`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.get(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: saveSchema, response: recordSchema },
    handler: ({ body }) => service.create(body, actorEmail())
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:uuid`,
    schemas: { body: saveSchema, params: paramsSchema, response: recordSchema },
    handler: ({ body, params }) => service.update(params.uuid, body, actorEmail())
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:uuid/archive`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.archive(params.uuid, actorEmail())
  });
}

function actorEmail() {
  const actor = requireProjectManagerActor();
  return actor.email ?? actor.id;
}
