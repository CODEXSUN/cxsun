import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactPersonTagsRoutes,
  type ContactPersonTagsRequestContext
} from "./contact-person-tags.routes.js";

export const contactPersonTagsModule = {
  key: "crm.contact-person-tags",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactPersonTagsRequestContext>
  ) => registerContactPersonTagsRoutes(app, context)
};
