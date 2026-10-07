import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactProfilesRoutes,
  type ContactProfilesRequestContext
} from "./contact-profiles.routes.js";

export const contactProfilesModule = {
  key: "crm.contact-profiles",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactProfilesRequestContext>
  ) => registerContactProfilesRoutes(app, context)
};
