import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { DiagnosticsService } from "./diagnostics.service.js";

export function registerDiagnosticsRoutes(app: FastifyInstance, service: DiagnosticsService) {
  registerContractRoute(app, {
    method: "GET",
    url: "/status",
    schemas: {
      response: z.object({
        sourceReady: z.boolean(),
        logReady: z.boolean(),
        modelReady: z.boolean()
      })
    },
    handler: () => service.status()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/diagnose",
    schemas: {
      body: z.object({ question: z.string().trim().min(3).max(2000) }).strict(),
      response: z.object({
        answer: z.string(),
        evidence: z.array(z.object({ source: z.string(), content: z.string() }))
      })
    },
    handler: async ({ body, request }) => {
      const diagnosis = await service.diagnose(body.question);
      request.log.info(
        {
          action: "zuno.diagnose",
          evidenceCount: diagnosis.evidence.length
        },
        "Zuno investigation completed"
      );
      return diagnosis;
    }
  });
}
