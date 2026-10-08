import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import type { FrappeSettings } from "../connection/index.js";
import { FrappeUserMappingService } from "./user-mapping.service.js";
import type { FrappeUserMappingContext } from "./user-mapping.types.js";

const localUser = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.string()
});
const mapping = z.object({
  localUserId: z.number().int().positive(),
  frappeUserId: z.string(),
  frappeEmail: z.string(),
  employeeCode: z.string().nullable(),
  connectionCurrent: z.boolean(),
  verifiedAt: z.string()
});
const params = z.object({ localUserId: z.coerce.number().int().positive() });

export function registerFrappeUserMappingRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<FrappeUserMappingContext>,
  defaults: FrappeSettings,
  encryptionSecret: string
) {
  const service = async (request: FastifyRequest) =>
    new FrappeUserMappingService(await context(request), defaults, encryptionSecret);

  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/user-mappings",
    schemas: { response: z.object({ localUsers: z.array(localUser), links: z.array(mapping) }) },
    handler: async ({ request }) => (await service(request)).list()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/frappe/user-mappings",
    schemas: {
      body: z.object({
        localUserId: z.number().int().positive(),
        frappeUserId: z.string().trim().min(1).max(191)
      }),
      response: mapping
    },
    handler: async ({ body, request }) => (await service(request)).save(body)
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/frappe/user-mappings/:localUserId",
    schemas: {
      params,
      response: z.object({ localUserId: z.number().int().positive() })
    },
    handler: async ({ params, request }) => (await service(request)).remove(params.localUserId)
  });
}
