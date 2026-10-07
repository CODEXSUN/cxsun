import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { EnquiryRepository } from "./enquiry.repository.js";
import { EnquiryService } from "./enquiry.service.js";
import { EnquiryWorkRepository } from "./enquiry.work.repository.js";
import { EnquiryWorkService } from "./enquiry.work.service.js";
import type { EnquiryRequestContext } from "./enquiry.routes.js";

const id = z.coerce.number().int().positive();
const enquiryParams = z.object({ id });
const childParams = z.object({ id, childId: id });
const jobInput = z.object({
  employeeUserId: id,
  startAt: z.iso.datetime({ offset: true }),
  stopAt: z.iso.datetime({ offset: true }).nullable(),
  ratePerHour: z.number().finite().nonnegative().max(10000000),
  status: z.enum(["running", "completed", "cancelled"])
});
const jobRecord = jobInput.omit({ employeeUserId: true }).extend({
  id,
  uuid: z.string(),
  enquiryId: id,
  employeeUserId: id.nullable(),
  employee: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const estimateInput = z.object({
  date: z.iso.date(),
  itemName: z.string().trim().min(1).max(255),
  supplierContactId: id,
  price: z.number().finite().positive().max(999999999999.99)
});
const estimateRecord = estimateInput.extend({
  id,
  uuid: z.string(),
  enquiryId: id,
  supplierName: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const activityRecord = z.object({
  id,
  uuid: z.string(),
  enquiryId: id,
  action: z.string(),
  details: z.string(),
  createdBy: z.string(),
  createdAt: z.string()
});

export function registerEnquiryWorkRoutes(
  app: FastifyInstance,
  context: (request: FastifyRequest) => Promise<EnquiryRequestContext>
) {
  const service = async (request: FastifyRequest) => {
    const scope = await context(request);
    return {
      scope,
      work: new EnquiryWorkService(
        new EnquiryService(new EnquiryRepository(scope.database), scope.relations, scope),
        new EnquiryWorkRepository(scope.database),
        scope.relations
      )
    };
  };
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries/:id/jobs",
    schemas: { params: enquiryParams, response: z.array(jobRecord) },
    handler: async ({ params, request }) => (await service(request)).work.listJobs(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/jobs/start",
    schemas: { params: enquiryParams, response: jobRecord },
    handler: async ({ params, request }) => {
      const { scope, work } = await service(request);
      return work.startJob(params.id, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/jobs",
    schemas: { params: enquiryParams, body: jobInput, response: jobRecord },
    handler: async ({ params, body, request }) => {
      const { scope, work } = await service(request);
      return work.saveJob(params.id, body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/crm/enquiries/:id/jobs/:childId",
    schemas: { params: childParams, body: jobInput, response: jobRecord },
    handler: async ({ params, body, request }) => {
      const { scope, work } = await service(request);
      return work.saveJob(params.id, body, scope.actorEmail, params.childId);
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/jobs/:childId/stop",
    schemas: { params: childParams, response: jobRecord },
    handler: async ({ params, request }) => {
      const { scope, work } = await service(request);
      return work.stopJob(params.id, params.childId, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries/:id/estimates",
    schemas: { params: enquiryParams, response: z.array(estimateRecord) },
    handler: async ({ params, request }) => (await service(request)).work.listEstimates(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/crm/enquiries/:id/estimates",
    schemas: { params: enquiryParams, body: estimateInput, response: estimateRecord },
    handler: async ({ params, body, request }) => {
      const { scope, work } = await service(request);
      return work.saveEstimate(params.id, body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/crm/enquiries/:id/estimates/:childId",
    schemas: { params: childParams, body: estimateInput, response: estimateRecord },
    handler: async ({ params, body, request }) => {
      const { scope, work } = await service(request);
      return work.saveEstimate(params.id, body, scope.actorEmail, params.childId);
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/crm/enquiries/:id/activity",
    schemas: { params: enquiryParams, response: z.array(activityRecord) },
    handler: async ({ params, request }) => (await service(request)).work.listActivity(params.id)
  });
}
