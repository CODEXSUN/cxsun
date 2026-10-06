import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerAuditorClientRoutes, type AuditorClientRequestContext } from "./client.routes.js";

export const auditorClientModule = {
  key: "auditor.client",
  // The host supplies its database and authenticated office-user context.
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<AuditorClientRequestContext>
  ) => registerAuditorClientRoutes(app, context)
};
