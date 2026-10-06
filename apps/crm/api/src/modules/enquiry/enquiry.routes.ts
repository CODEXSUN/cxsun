import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { EnquiryRepository } from "./enquiry.repository.js";
import { EnquiryService, type EnquiryRelations } from "./enquiry.service.js";
import type { EnquiryDatabase } from "./enquiry.types.js";

const nullableText = z.string().trim().nullable();
const inputSchema = z.object({
  title: z.string().trim().max(255).default(""),
  description: nullableText,
  contactId: z.number().int().positive().nullable(),
  capturedName: z.string().trim().max(191).nullable(),
  capturedEmail: z.email().max(191).nullable(),
  capturedPhone: z.string().trim().max(80).nullable(),
  source: z.string().trim().min(1).max(80),
  sourceReference: z.string().trim().max(191).nullable(),
  listIn: z.string().trim().max(120).nullable(),
  status: z.enum(["new", "contacted", "qualified", "unqualified"]),
  priority: z.enum(["low", "normal", "high"]),
  assignedUserId: z.number().int().positive().nullable(),
  enquiredAt: z.string().datetime({ offset: true }),
  dueDate: z.iso.date().nullable(),
  closedReason: nullableText
});
const recordSchema = inputSchema.extend({
  enquiryNo: z.number().int().positive().max(2147483646),
  title: z.string().min(1).max(255),
  id: z.number().int().positive(),
  uuid: z.string(),
  contactName: nullableText,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const idSchema = z.object({ id: z.coerce.number().int().positive() });

export type EnquiryRequestContext = {
  database: Kysely<EnquiryDatabase>;
  actorEmail: string;
  relations: EnquiryRelations;
};

export function registerEnquiryRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<EnquiryRequestContext>
) {
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      enquiry: new EnquiryService(new EnquiryRepository(scope.database), scope.relations)
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries",
    schemas: {
      querystring: z.object({ search: z.string().trim().max(191).optional() }),
      response: z.array(recordSchema)
    },
    handler: async ({ query, request }) => (await service(request)).enquiry.list(query.search)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries/:id",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => (await service(request)).enquiry.get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries",
    schemas: { body: inputSchema, response: recordSchema },
    handler: async ({ body, request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.create(body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/crm/enquiries/:id",
    schemas: { body: inputSchema, params: idSchema, response: recordSchema },
    handler: async ({ body, params, request }) =>
      (await service(request)).enquiry.update(params.id, body)
  });
}
