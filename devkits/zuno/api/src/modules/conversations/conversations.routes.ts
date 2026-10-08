import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type { ZunoCaseContext } from "../cases/cases.types.js";
import type { ZunoConfig } from "../diagnostics/diagnostics.types.js";
import type { RawWatchSnapshot } from "../watch/watch.types.js";
import { ConversationsService } from "./conversations.service.js";
import { workModes } from "./conversations.types.js";

const paramsSchema = z.object({ uuid: z.string().regex(/^[a-f0-9]{8}$/u) }).strict();
const querySchema = z.object({ archived: z.enum(["true", "false"]).optional() }).strict();
const threadSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  mode: z.enum(workModes),
  status: z.enum(["active", "busy", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string()
});
const messageSchema = z.object({
  uuid: z.string(),
  role: z.enum(["user", "assistant"]),
  status: z.enum(["complete", "error"]),
  content: z.string(),
  evidence: z.array(z.object({ source: z.string(), content: z.string() })),
  createdAt: z.string()
});
const detailSchema = z.object({ thread: threadSchema, messages: z.array(messageSchema) });
const sendSchema = z
  .object({ content: z.string().trim().min(1).max(20_000), mode: z.enum(workModes) })
  .strict();

export function registerConversationsRoutes(
  app: FastifyInstance,
  options: {
    config: ZunoConfig;
    loadWatchSnapshot(): Promise<RawWatchSnapshot>;
    resolveContext(request: FastifyRequest): Promise<ZunoCaseContext> | ZunoCaseContext;
  }
) {
  const service = async (request: FastifyRequest) =>
    new ConversationsService(
      await options.resolveContext(request),
      options.config,
      options.loadWatchSnapshot
    );
  registerContractRoute(app, {
    method: "GET",
    url: "/conversations",
    schemas: { querystring: querySchema, response: z.array(threadSchema) },
    handler: async ({ request, query }) => (await service(request)).list(query.archived === "true")
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/conversations",
    schemas: { body: z.object({ mode: z.enum(workModes) }).strict(), response: threadSchema },
    handler: async ({ request, body }) => (await service(request)).create(body.mode)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/conversations/:uuid",
    schemas: { params: paramsSchema, response: detailSchema },
    handler: async ({ request, params }) => (await service(request)).get(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/conversations/:uuid/messages",
    schemas: { params: paramsSchema, body: sendSchema, response: detailSchema },
    handler: async ({ request, params, body }) =>
      (await service(request)).send(params.uuid, body.content, body.mode)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/conversations/:uuid/title",
    schemas: {
      params: paramsSchema,
      body: z.object({ title: z.string().trim().min(1).max(255) }).strict(),
      response: threadSchema
    },
    handler: async ({ request, params, body }) =>
      (await service(request)).rename(params.uuid, body.title)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/conversations/:uuid/archive",
    schemas: { params: paramsSchema, response: threadSchema },
    handler: async ({ request, params }) => (await service(request)).archive(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/conversations/:uuid/restore",
    schemas: { params: paramsSchema, response: threadSchema },
    handler: async ({ request, params }) => (await service(request)).restore(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/conversations/:uuid/recover",
    schemas: { params: paramsSchema, response: detailSchema },
    handler: async ({ request, params }) => (await service(request)).recover(params.uuid)
  });
}
