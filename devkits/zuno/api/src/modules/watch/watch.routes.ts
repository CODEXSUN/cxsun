import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxsun/framework/http";
import { WatchService } from "./watch.service.js";

const targetSchema = z.object({
  scope: z.enum(["master", "tenant"]),
  name: z.string(),
  databaseStatus: z.enum(["online", "offline"]),
  backupStatus: z.enum(["fresh", "stale", "missing"]),
  latestBackupAt: z.string().nullable()
});

export function registerWatchRoutes(app: FastifyInstance, service: WatchService) {
  registerContractRoute(app, {
    method: "GET",
    url: "/watch",
    schemas: {
      response: z.object({
        checkedAt: z.string(),
        targets: z.array(targetSchema),
        queue: z.object({
          pending: z.number(),
          failed: z.number(),
          running: z.number(),
          sampleSize: z.number()
        }),
        api: z.object({
          responseCount: z.number(),
          errorCount: z.number(),
          p95Ms: z.number().nullable()
        })
      })
    },
    handler: () => service.snapshot()
  });
}
