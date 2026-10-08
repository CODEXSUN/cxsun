import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { ZetroChatRepository } from "./chat.repository.js";
import { ZetroChatService, type CustomerOutstandingLookup } from "./chat.service.js";
import { ZetroPolicyRepository } from "./chat.policy.js";
import type { ZetroConversation, ZetroDatabase, ZetroProviderConfig } from "./chat.types.js";

const idParams = z.object({ id: z.coerce.number().int().positive() }).strict();
const conversationSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const messageSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string()
});
const detailSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(messageSchema)
});

export type ZetroChatContext = {
  database: Kysely<ZetroDatabase>;
  actorEmail: string;
  provider: ZetroProviderConfig;
  lookupOutstanding: CustomerOutstandingLookup;
  audit: (action: string, conversation: ZetroConversation) => Promise<void>;
};

export function registerZetroChatRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<ZetroChatContext>
) {
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      actorEmail: scope.actorEmail,
      audit: scope.audit,
      chat: new ZetroChatService(
        new ZetroChatRepository(scope.database),
        scope.provider,
        new ZetroPolicyRepository(scope.database),
        scope.lookupOutstanding
      )
    };
  };

  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/conversations",
    schemas: { response: z.array(conversationSchema) },
    handler: async ({ request }) => {
      const { actorEmail, chat } = await service(request);
      return chat.list(actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/conversations/:id",
    schemas: { params: idParams, response: detailSchema },
    handler: async ({ params, request }) => {
      const { actorEmail, chat } = await service(request);
      return chat.get(params.id, actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/messages",
    schemas: {
      body: z
        .object({
          conversationId: z.number().int().positive().nullable(),
          prompt: z.string().trim().min(1).max(8000)
        })
        .strict(),
      response: detailSchema
    },
    handler: async ({ body, request }) => {
      const { actorEmail, audit, chat } = await service(request);
      const result = await chat.send(actorEmail, body.conversationId, body.prompt);
      await audit("message.create", result.conversation);
      return result;
    }
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/zetro/conversations/:id",
    schemas: { params: idParams, response: z.object({ deleted: z.literal(true) }) },
    handler: async ({ params, request }) => {
      const { actorEmail, audit, chat } = await service(request);
      const { conversation } = await chat.get(params.id, actorEmail);
      const result = await chat.delete(params.id, actorEmail);
      await audit("conversation.delete", conversation);
      return result;
    }
  });
}
