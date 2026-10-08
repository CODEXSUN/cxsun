import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import type { FrappeSettings } from "../connection/index.js";
import { FrappeEnquirySyncService } from "./enquiry-sync.service.js";
import type { EnquirySyncContext } from "./enquiry-sync.types.js";

const remoteEnquirySchema = z.object({
  name: z.string(),
  title: z.string(),
  mobile: z.string().nullable(),
  date: z.string().nullable(),
  status: z.string().nullable(),
  priority: z.string().nullable(),
  modifiedAt: z.string().nullable(),
  localEnquiryId: z.number().int().positive().nullable()
});

export function registerFrappeEnquirySyncRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<EnquirySyncContext>,
  defaults: FrappeSettings,
  encryptionSecret: string
) {
  const service = async (request: FastifyRequest) =>
    new FrappeEnquirySyncService(await context(request), defaults, encryptionSecret);

  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/enquiries/remote",
    schemas: { response: z.array(remoteEnquirySchema) },
    handler: async ({ request }) => (await service(request)).preview()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/frappe/enquiries/pull",
    schemas: {
      body: z.object({ remoteName: z.string().trim().min(1).max(191) }),
      response: z.object({
        remoteName: z.string(),
        enquiryId: z.number().int().positive(),
        status: z.enum(["created", "updated"])
      })
    },
    handler: async ({ request, body }) => (await service(request)).pull(body.remoteName)
  });
}
