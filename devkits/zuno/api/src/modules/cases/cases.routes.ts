import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { CasesService } from "./cases.service.js";
import { caseKinds, caseSeverities, caseStatuses, type ZunoCaseContext } from "./cases.types.js";

const uuidParams = z.object({ uuid: z.string().regex(/^[a-f0-9]{8}$/u) }).strict();
const sqlPlanSchema = z
  .object({
    table: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/u),
    column: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/u),
    rowId: z.number().int().positive(),
    expectedValue: z.string().max(10_000),
    replacementValue: z.string().max(10_000)
  })
  .strict();
const caseSchema = z.object({
  uuid: z.string(),
  kind: z.enum(caseKinds),
  severity: z.enum(caseSeverities),
  status: z.enum(caseStatuses),
  tenantId: z.number().int().positive().nullable(),
  title: z.string(),
  description: z.string(),
  proposal: z.string(),
  sqlPlan: sqlPlanSchema.nullable(),
  verification: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const activitySchema = z.object({
  action: z.string(),
  detail: z.string(),
  actorEmail: z.string(),
  createdAt: z.string()
});
const createSchema = z
  .object({
    kind: z.enum(caseKinds),
    severity: z.enum(caseSeverities),
    tenantId: z.number().int().positive().nullable(),
    title: z.string().trim().min(3).max(255),
    description: z.string().trim().min(10).max(20_000)
  })
  .strict();
const proposalSchema = z.object({ proposal: z.string().trim().min(20).max(30_000) }).strict();
const verificationSchema = z
  .object({ verification: z.string().trim().min(10).max(10_000) })
  .strict();
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(2_000) }).strict();

export function registerCasesRoutes(
  app: FastifyInstance,
  resolveContext: (request: FastifyRequest) => Promise<ZunoCaseContext> | ZunoCaseContext
) {
  const service = async (request: FastifyRequest) =>
    new CasesService(await resolveContext(request));
  registerContractRoute(app, {
    method: "GET",
    url: "/cases",
    schemas: { response: z.array(caseSchema) },
    handler: async ({ request }) => (await service(request)).list()
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/cases/targets",
    schemas: {
      response: z.array(z.object({ id: z.number().int().positive(), label: z.string() }))
    },
    handler: async ({ request }) => (await service(request)).targets()
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/cases/:uuid",
    schemas: {
      params: uuidParams,
      response: z.object({ record: caseSchema, activity: z.array(activitySchema) })
    },
    handler: async ({ params, request }) => (await service(request)).get(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases",
    schemas: { body: createSchema, response: caseSchema },
    handler: async ({ body, request }) => (await service(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/cases/:uuid/proposal",
    schemas: { params: uuidParams, body: proposalSchema, response: caseSchema },
    handler: async ({ body, params, request }) =>
      (await service(request)).propose(params.uuid, body.proposal)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases/:uuid/approve",
    schemas: { params: uuidParams, response: caseSchema },
    handler: async ({ params, request }) => (await service(request)).approve(params.uuid)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/cases/:uuid/sql-plan",
    schemas: {
      params: uuidParams,
      body: sqlPlanSchema,
      response: z.object({
        record: caseSchema,
        preview: z.object({ currentValue: z.string().nullable(), sql: z.string() })
      })
    },
    handler: async ({ body, params, request }) =>
      (await service(request)).planTextCorrection(params.uuid, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases/:uuid/execute-sql",
    schemas: { params: uuidParams, response: caseSchema },
    handler: async ({ params, request }) =>
      (await service(request)).executeTextCorrection(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases/:uuid/reconcile-sql",
    schemas: { params: uuidParams, response: caseSchema },
    handler: async ({ params, request }) =>
      (await service(request)).reconcileTextCorrection(params.uuid)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases/:uuid/complete",
    schemas: { params: uuidParams, body: verificationSchema, response: caseSchema },
    handler: async ({ body, params, request }) =>
      (await service(request)).complete(params.uuid, body.verification)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/cases/:uuid/cancel",
    schemas: { params: uuidParams, body: reasonSchema, response: caseSchema },
    handler: async ({ body, params, request }) =>
      (await service(request)).cancel(params.uuid, body.reason)
  });
}
