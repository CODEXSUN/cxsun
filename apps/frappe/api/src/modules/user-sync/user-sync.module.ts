import type { FastifyInstance, FastifyRequest } from "fastify";
import type { FrappeSettings } from "../connection/index.js";
import { registerFrappeUserSyncRoutes } from "./user-sync.routes.js";
import type { FrappeUserSyncContext } from "./user-sync.types.js";

export const frappeUserSyncModule = {
  key: "frappe.user-sync",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<FrappeUserSyncContext>,
    defaults: FrappeSettings,
    encryptionSecret: string
  ) {
    registerFrappeUserSyncRoutes(app, context, defaults, encryptionSecret);
  }
};
