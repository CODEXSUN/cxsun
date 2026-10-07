import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    correlationId?: string;
    tenantId?: string;
  }
}

export function registerTenantContext(app: FastifyInstance): void {
  app.decorateRequest("tenantId", undefined);
  app.decorateRequest("correlationId", undefined);

  app.addHook("onRequest", async (request, reply) => {
    const correlationHeader = request.headers["x-correlation-id"];
    if (typeof correlationHeader === "string" && correlationHeader.trim().length > 0) {
      request.correlationId = correlationHeader.trim();
    } else {
      request.correlationId = request.id;
    }
    reply.header("x-correlation-id", request.correlationId);
  });
}
