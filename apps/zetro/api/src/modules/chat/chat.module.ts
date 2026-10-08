import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerZetroChatRoutes, type ZetroChatContext } from "./chat.routes.js";
import type { ZetroProviderConfig } from "./chat.types.js";

// Synchronous chat capability. No seed records, background worker, or offline sync.
export const zetroChatModule = {
  key: "zetro.chat",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ZetroChatContext>,
    provider: ZetroProviderConfig
  ) {
    registerZetroChatRoutes(app, context, provider);
  }
};
