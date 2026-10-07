import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactClassificationsRoutes,
  type ContactClassificationsRequestContext
} from "./contact-classifications.routes.js";

export const contactClassificationsModule = {
  key: "crm.contact-classifications",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactClassificationsRequestContext>
  ) => registerContactClassificationsRoutes(app, context)
};
