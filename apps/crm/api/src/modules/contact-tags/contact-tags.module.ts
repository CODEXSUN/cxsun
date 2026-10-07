import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactTagsRoutes,
  type ContactTagsRequestContext
} from "./contact-tags.routes.js";

export const contactTagsModule = {
  key: "crm.contact-tags",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactTagsRequestContext>
  ) => registerContactTagsRoutes(app, context)
};
