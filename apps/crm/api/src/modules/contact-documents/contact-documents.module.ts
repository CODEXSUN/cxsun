import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactDocumentsRoutes,
  type ContactDocumentsRequestContext
} from "./contact-documents.routes.js";

export const contactDocumentsModule = {
  key: "crm.contact-documents",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactDocumentsRequestContext>
  ) => registerContactDocumentsRoutes(app, context)
};
