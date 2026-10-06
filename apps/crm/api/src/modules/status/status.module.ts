import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerStatusRoutes, type StatusRequestContext } from "./status.routes.js";

export const statusModule = {
  key: "crm.status",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<StatusRequestContext>
  ) => registerStatusRoutes(app, context)
};
