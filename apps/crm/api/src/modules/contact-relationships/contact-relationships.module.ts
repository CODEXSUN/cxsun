import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactRelationshipsRoutes,
  type ContactRelationshipsRequestContext
} from "./contact-relationships.routes.js";

export const contactRelationshipsModule = {
  key: "crm.contact-relationships",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactRelationshipsRequestContext>
  ) => registerContactRelationshipsRoutes(app, context)
};
