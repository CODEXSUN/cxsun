import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerCasesRoutes } from "./cases.routes.js";
import type { ZunoCaseContext } from "./cases.types.js";

// Cases use master persistence and audit. They do not have seed, event, worker, or offline sync behavior.
export const casesModule = {
  key: "zuno.cases",
  register({
    app,
    resolveContext
  }: {
    app: FastifyInstance;
    resolveContext: (request: FastifyRequest) => Promise<ZunoCaseContext> | ZunoCaseContext;
  }) {
    registerCasesRoutes(app, resolveContext);
  }
};
