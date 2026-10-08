import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import type { FrappeSettings } from "../connection/index.js";
import { FrappeUserSyncService } from "./user-sync.service.js";
import type { FrappeUserSyncContext } from "./user-sync.types.js";

const user = z.object({
  frappeUserId: z.string(),
  name: z.string(),
  email: z.string(),
  employeeCode: z.string().nullable(),
  userType: z.string(),
  lastActiveAt: z.string().nullable(),
  localUserId: z.number().nullable(),
  localStatus: z.string().nullable()
});

export function registerFrappeUserSyncRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<FrappeUserSyncContext>,
  defaults: FrappeSettings,
  encryptionSecret: string
) {
  const service = async (request: FastifyRequest) =>
    new FrappeUserSyncService(await context(request), defaults, encryptionSecret);

  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/users/preview",
    schemas: { response: z.array(user) },
    handler: async ({ request }) => (await service(request)).preview()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/frappe/users/import",
    schemas: {
      body: z.object({
        frappeUserId: z.string().trim().min(1).max(255),
        password: z
          .string()
          .min(8)
          .max(128)
          .refine((value) => value === value.trim(), {
            message: "Password cannot start or end with whitespace."
          })
          .optional()
      }),
      response: z.object({
        status: z.enum(["created", "already-exists"]),
        userId: z.number().int().positive(),
        password: z.string().nullable()
      })
    },
    handler: async ({ body, request }) =>
      (await service(request)).import(body.frappeUserId, body.password)
  });
}
