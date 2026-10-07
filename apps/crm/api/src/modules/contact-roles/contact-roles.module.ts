import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactRolesRoutes,
  type ContactRolesRequestContext
} from "./contact-roles.routes.js";

export const contactRolesModule = {
  key: "crm.contact-roles",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactRolesRequestContext>
  ) => registerContactRolesRoutes(app, context)
};
