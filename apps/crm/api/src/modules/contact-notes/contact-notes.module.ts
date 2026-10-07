import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactNotesRoutes,
  type ContactNotesRequestContext
} from "./contact-notes.routes.js";

export const contactNotesModule = {
  key: "crm.contact-notes",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactNotesRequestContext>
  ) => registerContactNotesRoutes(app, context)
};
