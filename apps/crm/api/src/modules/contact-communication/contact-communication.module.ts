import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactCommunicationRoutes,
  type ContactCommunicationRequestContext
} from "./contact-communication.routes.js";

export const contactCommunicationModule = {
  key: "crm.contact-communication",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactCommunicationRequestContext>
  ) => registerContactCommunicationRoutes(app, context)
};
