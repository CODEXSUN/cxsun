import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import type {} from "@cxsun/framework/api";
import { EnquiryRepository } from "./enquiry.repository.js";
import { EnquiryService, type EnquiryRelations } from "./enquiry.service.js";
import type { EnquiryDatabase } from "./enquiry.types.js";
import { registerEnquiryWorkRoutes } from "./enquiry.work.routes.js";

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
  listInId: z.number().int().positive().nullable(),
  statusId: z.number().int().positive(),
  priorityId: z.number().int().positive(),
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
  listIn: nullableText,
  status: z.string(),
  statusName: z.string(),
  priority: z.string(),
  priorityName: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const commentSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  enquiryId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
  body: z.string(),
  bodyFormat: z.enum(["plain", "html"]),
  createdBy: z.string(),
  createdAt: z.string()
});
const commentInputSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  bodyFormat: z.enum(["plain", "html"]).default("plain"),
  parentId: z.number().int().positive().nullable().default(null)
});
const propertySchema = inputSchema
  .pick({
    listInId: true,
    priorityId: true,
    assignedUserId: true,
    dueDate: true,
    statusId: true
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Choose a property to update.");

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
    url: "/crm/enquiries/overview-activity",
    schemas: { response: z.object({ commentsByYou30Days: z.number().int().nonnegative() }) },
    handler: async ({ request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.overviewActivity(scope.actorEmail);
    }
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
    handler: async ({ body, params, request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.update(params.id, body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PATCH",
    url: "/crm/enquiries/:id/properties",
    schemas: { body: propertySchema, params: idSchema, response: recordSchema },
    handler: async ({ body, params, request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.updateProperties(params.id, body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/open-new-call",
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params, request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.openNewCall(params.id, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries/:id/comments",
    schemas: { params: idSchema, response: z.array(commentSchema) },
    handler: async ({ params, request }) => (await service(request)).enquiry.listComments(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/comments",
    schemas: { params: idSchema, body: commentInputSchema, response: commentSchema },
    handler: async ({ params, body, request }) => {
      const { enquiry, scope } = await service(request);
      return enquiry.addComment(
        params.id,
        body.body,
        body.parentId,
        scope.actorEmail,
        body.bodyFormat
      );
    }
  });
  registerEnquiryWorkRoutes(app, context);
}
