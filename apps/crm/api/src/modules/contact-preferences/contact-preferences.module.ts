import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactPreferencesRoutes,
  type ContactPreferencesRequestContext
} from "./contact-preferences.routes.js";

export const contactPreferencesModule = {
  key: "crm.contact-preferences",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactPreferencesRequestContext>
  ) => registerContactPreferencesRoutes(app, context)
};
