import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import type { EnquiryListOptions, EnquiryRecord } from "@cxsun/crm-api/enquiry-sync";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { FrappeConnectionService } from "./connection.service.js";
import type { FrappeDatabase, FrappeSettings } from "./connection.types.js";

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const overviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(191).default("")
});
const statusSchema = z.object({
  enquiryId: z.number().int().positive(),
  remoteName: z.string().nullable(),
  syncedAt: z.string().nullable()
});
const connectionInputSchema = z.object({
  connectionName: z.string().trim().min(1).max(191),
  baseUrl: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/"
      );
    }, "Enter an HTTP or HTTPS Frappe origin without a path or credentials."),
  apiKey: z.string().trim().max(512),
  apiSecret: z.string().trim().max(512),
  enabled: z.boolean()
});
const connectionResponseSchema = z.object({
  source: z.enum(["tenant", "environment"]),
  configured: z.boolean(),
  enabled: z.boolean(),
  baseUrl: z.string().nullable(),
  connectionName: z.string(),
  appKeyConfigured: z.boolean(),
  appSecretConfigured: z.boolean(),
  verificationStatus: z.enum(["unverified", "verified", "failed"]),
  lastCheckedAt: z.string().nullable(),
  lastVerifiedAt: z.string().nullable()
});

export function registerFrappeRoutes(
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
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    return new FrappeConnectionService(
      scope.database,
      settings,
      scope.loadEnquiry,
      scope.viewer,
      encryptionSecret,
      scope.mappedEmployeeCode
    );
  };

  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/overview",
    schemas: {
      querystring: overviewQuerySchema,
      response: z.object({
        counts: z.object({ total: z.number(), synced: z.number(), pending: z.number() }),
        items: z.array(
          z.object({
            id: z.number(),
            enquiryNo: z.number(),
            title: z.string(),
            status: z.string(),
            updatedAt: z.string(),
            remoteName: z.string().nullable(),
            syncedAt: z.string().nullable()
          })
        ),
        page: z.number(),
        pageSize: z.number(),
        total: z.number()
      })
    },
    handler: async ({ query, request }) =>
      (await service(request)).overview(query.page, query.pageSize, query.search)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/connection",
    schemas: { response: connectionResponseSchema },
    handler: async ({ request }) => (await service(request)).configured()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/frappe/connection",
    schemas: { body: connectionInputSchema, response: connectionResponseSchema },
    handler: async ({ body, request }) => (await service(request)).saveConnection(body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/frappe/connection/verify",
    schemas: {
      body: connectionInputSchema.partial().optional(),
      response: z.object({ connected: z.boolean(), user: z.string(), saved: z.boolean() })
    },
    handler: async ({ body, request }) => (await service(request)).verify(body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/frappe/enquiries/:id/sync",
    schemas: { params: idSchema, response: statusSchema },
    handler: async ({ params, request }) => (await service(request)).status(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/frappe/enquiries/:id/sync",
    schemas: {
      params: idSchema,
      response: statusSchema.extend({ remoteName: z.string(), syncedAt: z.string() })
    },
    handler: async ({ params, request }) => (await service(request)).sync(params.id)
  });
}
