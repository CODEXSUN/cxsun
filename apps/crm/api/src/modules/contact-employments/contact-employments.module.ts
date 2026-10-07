import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactEmploymentsRoutes,
  type ContactEmploymentsRequestContext
} from "./contact-employments.routes.js";

export const contactEmploymentsModule = {
  key: "crm.contact-employments",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactEmploymentsRequestContext>
  ) => registerContactEmploymentsRoutes(app, context)
};
