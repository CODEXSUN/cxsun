import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZunoCaseContext } from "../cases/cases.types.js";
import type { ZunoConfig } from "../diagnostics/diagnostics.types.js";
import type { RawWatchSnapshot } from "../watch/watch.types.js";
import { registerConversationsRoutes } from "./conversations.routes.js";

export const conversationsModule = {
  key: "zuno.conversations",
  register(options: {
    app: FastifyInstance;
    config: ZunoConfig;
    loadWatchSnapshot(): Promise<RawWatchSnapshot>;
    resolveContext(request: FastifyRequest): Promise<ZunoCaseContext> | ZunoCaseContext;
  }) {
    registerConversationsRoutes(options.app, options);
  }
};
