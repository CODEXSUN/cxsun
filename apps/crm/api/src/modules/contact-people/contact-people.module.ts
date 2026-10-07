import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  registerContactPeopleRoutes,
  type ContactPeopleRequestContext
} from "./contact-people.routes.js";

export const contactPeopleModule = {
  key: "crm.contact-people",
  seedPolicy: "permissions only; user-owned records",
  deletionPolicy: "deactivate to retain contact history",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<ContactPeopleRequestContext>
  ) => registerContactPeopleRoutes(app, context)
};
