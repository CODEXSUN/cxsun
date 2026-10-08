import type { FastifyInstance, FastifyRequest } from "fastify";
import type { FrappeSettings } from "../connection/index.js";
import { registerFrappeEnquirySyncRoutes } from "./enquiry-sync.routes.js";
import type { EnquirySyncContext } from "./enquiry-sync.types.js";

export const frappeEnquirySyncModule = {
  key: "frappe.enquiry-sync",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<EnquirySyncContext>,
    defaults: FrappeSettings,
    encryptionSecret: string
  ) {
    registerFrappeEnquirySyncRoutes(app, context, defaults, encryptionSecret);
  }
};
