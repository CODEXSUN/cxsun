import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerListInRoutes, type ListInRequestContext } from "./list-in.routes.js";

export const listInModule = {
  key: "crm.list-in",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ListInRequestContext>
  ) => registerListInRoutes(app, context)
};
