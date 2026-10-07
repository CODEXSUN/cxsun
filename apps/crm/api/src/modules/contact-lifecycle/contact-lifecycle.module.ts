import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactLifecycleRoutes,
  type ContactLifecycleRequestContext
} from "./contact-lifecycle.routes.js";

export const contactLifecycleModule = {
  key: "crm.contact-lifecycle",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactLifecycleRequestContext>
  ) => registerContactLifecycleRoutes(app, context)
};
