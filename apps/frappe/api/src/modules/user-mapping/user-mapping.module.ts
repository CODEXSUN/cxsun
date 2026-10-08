import type { FastifyInstance, FastifyRequest } from "fastify";
import type { FrappeSettings } from "../connection/index.js";
import { registerFrappeUserMappingRoutes } from "./user-mapping.routes.js";
import type { FrappeUserMappingContext } from "./user-mapping.types.js";

// This mapping has no seed rows or worker; links are created only by an authorized user.
export const frappeUserMappingModule = {
  key: "frappe.user-mapping",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<FrappeUserMappingContext>,
    defaults: FrappeSettings,
    encryptionSecret: string
  ) {
    registerFrappeUserMappingRoutes(app, context, defaults, encryptionSecret);
  }
};
