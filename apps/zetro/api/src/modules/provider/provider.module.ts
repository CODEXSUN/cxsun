import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerZetroProviderRoutes, type ZetroProviderContext } from "./provider.routes.js";
import type { ZetroProviderConfig } from "../chat/chat.types.js";

export const zetroProviderModule = {
  key: "zetro.provider",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ZetroProviderContext>,
    fallback: ZetroProviderConfig,
    encryptionSecret: string
  ) {
    registerZetroProviderRoutes(app, context, fallback, encryptionSecret);
  }
};
