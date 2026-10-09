import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { ZetroPolicyRepository } from "./chat.policy.js";
import { ZetroPatternRepository } from "./chat.pattern.repository.js";
import { ZETRO_RECORD_CAPABILITIES } from "./chat.patterns.js";
import type { ZetroDatabase } from "./chat.types.js";

const tenantParams = z.object({ tenantId: z.string().min(1) }).strict();
const conversationParams = tenantParams.extend({ id: z.coerce.number().int().positive() });
const approvalParams = tenantParams.extend({ id: z.coerce.number().int().positive() });
const grantBody = z
  .object({
    roleKey: z.string().min(1).max(100),
    capabilityKey: z.enum(ZETRO_RECORD_CAPABILITIES).default("billing.customer-outstanding.read"),
    status: z.enum(["active", "revoked"]),
    reason: z.string().trim().min(1).max(500)
  })
  .strict();
const patternDraftBody = z
  .object({
    serialNo: z.number().int().min(7),
    questionPattern: z.string().trim().min(3).max(500),
    queryPattern: z.string().regex(/^[a-z][a-z0-9.-]{1,99}$/u),
    limitation: z.string().trim().min(3).max(500),
    extra: z.string().trim().max(2000)
  })
  .strict();

export function registerZetroAdminRoutes(
  app: FastifyInstance,
  context: (
    request: FastifyRequest,
    tenantId: string
  ) => Promise<{
    database: Kysely<ZetroDatabase>;
    actorEmail: string;
  }>
) {
  const policy = async (request: FastifyRequest, tenantId: string) => {
    const scope = await context(request, tenantId);
    return { actorEmail: scope.actorEmail, repository: new ZetroPolicyRepository(scope.database) };
  };
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/patterns",
    schemas: { params: tenantParams, response: z.unknown() },
    handler: async ({ params, request }) => {
      const scope = await context(request, params.tenantId);
      return new ZetroPatternRepository(scope.database).list();
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/admin/tenants/:tenantId/patterns",
    schemas: {
      params: tenantParams,
      body: patternDraftBody,
      response: z.object({ uuid: z.uuid(), status: z.literal("draft") })
    },
    handler: async ({ params, body, request }) => {
      const scope = await context(request, params.tenantId);
      return new ZetroPatternRepository(scope.database).createDraft(body, scope.actorEmail);
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/grants",
    schemas: { params: tenantParams, response: z.unknown() },
    handler: async ({ params, request }) =>
      (await policy(request, params.tenantId)).repository.grants()
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/roles",
    schemas: { params: tenantParams, response: z.unknown() },
    handler: async ({ params, request }) =>
      (await policy(request, params.tenantId)).repository.roles()
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/grants/events",
    schemas: { params: tenantParams, response: z.unknown() },
    handler: async ({ params, request }) =>
      (await policy(request, params.tenantId)).repository.grantEvents()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/zetro/admin/tenants/:tenantId/grants",
    schemas: {
      params: tenantParams,
      body: grantBody,
      response: z.object({ saved: z.literal(true) })
    },
    handler: async ({ params, body, request }) => {
      const { actorEmail, repository } = await policy(request, params.tenantId);
      await repository.setGrant(
        body.roleKey,
        body.capabilityKey,
        body.status,
        actorEmail,
        body.reason
      );
      return { saved: true as const };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/conversations",
    schemas: {
      params: tenantParams,
      querystring: z.object({ ownerEmail: z.email().optional() }).strict(),
      response: z.unknown()
    },
    handler: async ({ params, query, request }) =>
      (await policy(request, params.tenantId)).repository.listReview(query.ownerEmail)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/interactions",
    schemas: {
      params: tenantParams,
      querystring: z.object({ ownerEmail: z.email().optional() }).strict(),
      response: z.unknown()
    },
    handler: async ({ params, query, request }) =>
      (await policy(request, params.tenantId)).repository.interactions(query.ownerEmail)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/conversations/:id",
    schemas: { params: conversationParams, response: z.unknown() },
    handler: async ({ params, request }) =>
      (await policy(request, params.tenantId)).repository.review(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/admin/tenants/:tenantId/conversations/:id/notes",
    schemas: {
      params: conversationParams,
      body: z.object({ note: z.string().trim().min(1).max(5000) }).strict(),
      response: z.object({ saved: z.literal(true) })
    },
    handler: async ({ params, body, request }) => {
      const { actorEmail, repository } = await policy(request, params.tenantId);
      await repository.addNote(params.id, actorEmail, body.note);
      return { saved: true as const };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/zetro/admin/tenants/:tenantId/approvals",
    schemas: { params: tenantParams, response: z.unknown() },
    handler: async ({ params, request }) =>
      (await policy(request, params.tenantId)).repository.approvals()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/zetro/admin/tenants/:tenantId/approvals/:id/decision",
    schemas: {
      params: approvalParams,
      body: z
        .object({
          status: z.enum(["approved", "rejected"]),
          note: z.string().trim().min(1).max(5000)
        })
        .strict(),
      response: z.object({ saved: z.literal(true) })
    },
    handler: async ({ params, body, request }) => {
      const { actorEmail, repository } = await policy(request, params.tenantId);
      await repository.decideApproval(params.id, actorEmail, body.status, body.note);
      return { saved: true as const };
    }
  });
}
