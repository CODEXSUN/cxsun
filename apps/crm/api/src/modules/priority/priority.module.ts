import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerPriorityRoutes, type PriorityRequestContext } from "./priority.routes.js";

export const priorityModule = {
  key: "crm.priority",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<PriorityRequestContext>
  ) => registerPriorityRoutes(app, context)
};
