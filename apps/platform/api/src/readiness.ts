import { createConnection } from "mysql2/promise";
import type { HealthCheck } from "@cxsun/framework/health";
import { env } from "./env.js";
import { probeBullMq } from "./modules/queue-manager/queue-manager.bullmq.js";
import { isQueueWorkerHealthy } from "./modules/queue-manager/queue-manager.runtime.js";
import type { QueueManagerService } from "./modules/queue-manager/queue-manager.service.js";

export function platformReadinessChecks(queueService: QueueManagerService): HealthCheck[] {
  return [
    {
      name: "platform-database",
      check: async () => {
        try {
          await probeDatabase();
          return { status: "ok" };
        } catch {
          return { status: "down" };
        }
      }
    },
    {
      name: "queue-runtime",
      check: async () => {
        if (!isQueueWorkerHealthy()) return { status: "down" };
        try {
          const backend = await withTimeout(queueService.currentBackend(), 4000);
          if (backend === "bullmq-redis") await withTimeout(probeBullMq(), 4000);
          return { status: "ok" };
        } catch {
          return { status: "down" };
        }
      }
    }
  ];
}

async function probeDatabase() {
  const connection = await createConnection({
    connectTimeout: 3000,
    database: env.DB_MASTER_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  });
  try {
    await connection.query({ sql: "SELECT 1", timeout: 3000 });
  } finally {
    connection.destroy();
  }
}

async function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness probe timed out.")), milliseconds);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
