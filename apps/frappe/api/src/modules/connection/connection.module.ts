import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import type { EnquiryListOptions, EnquiryRecord } from "@cxsun/crm-api/enquiry-sync";
import { registerFrappeRoutes } from "./connection.routes.js";
import type { FrappeDatabase, FrappeSettings } from "./connection.types.js";

// HTTP sync only. No local Frappe business data, seed, event, or background worker.
export const frappeConnectionModule = {
  key: "frappe.connection",
  register(
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<{
      database: Kysely<FrappeDatabase>;
      loadEnquiry: (id: number) => Promise<EnquiryRecord>;
      mappedEmployeeCode: (localEmail: string, baseUrl: string) => Promise<string | null>;
      viewer: Pick<EnquiryListOptions, "actorEmail" | "actorUserId" | "canViewAll">;
    }>,
    settings: FrappeSettings,
    encryptionSecret: string
  ) {
    registerFrappeRoutes(app, context, settings, encryptionSecret);
  }
};
