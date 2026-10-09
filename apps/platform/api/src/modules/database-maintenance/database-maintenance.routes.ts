import type { FastifyInstance } from "fastify";
import { Readable } from "node:stream";
import { z } from "zod";
import { AppError } from "@cxsun/framework/errors";
import { ok } from "@cxsun/framework/http";
import { registerContractRoute } from "@cxsun/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { DatabaseMaintenanceService } from "./database-maintenance.service.js";
import { MasterBackupFiles } from "./database-maintenance.backups.js";
import { TenantBackupFiles } from "./database-maintenance.tenant-backups.js";
import type { DatabaseActionPayload } from "./database-maintenance.types.js";

const service = new DatabaseMaintenanceService();
const backupFiles = new MasterBackupFiles();
const tenantBackupFiles = new TenantBackupFiles();
const tenantIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const databaseActionSchema = z.object({
  note: z.string().trim().max(240).optional(),
  tenantId: z.number().int().positive().optional()
});
const databaseRunSchema = z.object({
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  databaseName: z.string(),
  details: z.record(z.string(), z.unknown()),
  id: z.number(),
  operation: z.enum(["backup", "migrate", "refresh", "reinstall", "restore", "setup", "status"]),
  scope: z.enum(["master", "tenant"]),
  status: z.enum(["completed", "failed", "requested", "running"]),
  targetKey: z.string(),
  uuid: z.string()
});

export async function registerDatabaseMaintenanceRoutes(app: FastifyInstance) {
  app.addContentTypeParser("application/vnd.cxsun.database-backup", (_request, payload, done) => {
    done(null, payload);
  });
  registerTenantInstallRoute(app, "setup");
  registerTenantInstallRoute(app, "reinstall");
  app.get("/admin/database/master", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.masterStatus(), { requestId: request.id })
  );
  app.get("/admin/database/tenants", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.tenantStatuses(), { requestId: request.id })
  );
  app.get(
    "/admin/database/tenants/:id/details",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const details = await service.tenantDetails(Number((request.params as { id: string }).id));
      if (!details)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(details, { requestId: request.id });
    }
  );
  app.post("/admin/database/master/migrate", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.migrateMaster(request.body as DatabaseActionPayload), {
      requestId: request.id
    })
  );
  app.post("/admin/database/master/backup", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.requestMasterBackup(request.body as DatabaseActionPayload), {
      requestId: request.id
    })
  );
  app.get("/admin/database/master/backups", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await backupFiles.list(), { requestId: request.id })
  );
  app.get(
    "/admin/database/master/backups/:id/download",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const runId = z.coerce
        .number()
        .int()
        .positive()
        .parse((request.params as { id: string }).id);
      const file = await backupFiles.download(runId);
      return reply
        .header("Cache-Control", "no-store")
        .header("Content-Disposition", `attachment; filename="${file.fileName}"`)
        .header("Content-Length", file.sizeBytes)
        .type("application/sql")
        .send(file.stream);
    }
  );
  app.post(
    "/admin/database/master/backups/upload",
    { preHandler: requireSuperAdmin },
    async (request) => {
      if (!(request.body instanceof Readable))
        throw AppError.validation("Choose a SQL backup file.");
      const encodedName = request.headers["x-cxsun-filename"];
      if (typeof encodedName !== "string")
        throw AppError.validation("Backup filename is required.");
      let fileName: string;
      try {
        fileName = decodeURIComponent(encodedName);
      } catch {
        throw AppError.validation("Backup filename is invalid.");
      }
      return ok(await backupFiles.upload(fileName, request.body), { requestId: request.id });
    }
  );
  registerContractRoute(app, {
    method: "POST",
    url: "/admin/database/master/restore",
    preHandler: requireSuperAdmin,
    schemas: {
      body: z.object({
        backupRunId: z.number().int().positive(),
        sandboxMode: z.enum(["fresh", "append"]),
        note: z.string().trim().max(240).optional()
      }),
      response: databaseRunSchema
    },
    handler: async ({ body }) => service.requestMasterRestore(body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/admin/database/master/restores/:id",
    preHandler: requireSuperAdmin,
    schemas: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      response: databaseRunSchema
    },
    handler: async ({ params }) => service.masterRestoreRun(params.id)
  });
  app.post(
    "/admin/database/tenants/:id/migrate",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const run = await service.migrateTenant(
        Number((request.params as { id: string }).id),
        request.body as DatabaseActionPayload
      );
      if (!run)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(run, { requestId: request.id });
    }
  );
  app.post(
    "/admin/database/tenants/:id/backup",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const run = await service.requestTenantBackup(
        Number((request.params as { id: string }).id),
        request.body as DatabaseActionPayload
      );
      if (!run)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(run, { requestId: request.id });
    }
  );
  app.get(
    "/admin/database/tenants/:id/backups",
    { preHandler: requireSuperAdmin },
    async (request) => {
      const { id } = tenantIdParamsSchema.parse(request.params);
      return ok(await tenantBackupFiles.list(id), { requestId: request.id });
    }
  );
  app.get(
    "/admin/database/tenants/:id/backups/:runId/download",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id, runId } = z
        .object({
          id: z.coerce.number().int().positive(),
          runId: z.coerce.number().int().positive()
        })
        .parse(request.params);
      const file = await tenantBackupFiles.download(id, runId);
      return reply
        .header("Cache-Control", "no-store")
        .header("Content-Disposition", `attachment; filename="${file.fileName}"`)
        .header("Content-Length", file.sizeBytes)
        .type("application/sql")
        .send(file.stream);
    }
  );
  app.post(
    "/admin/database/tenants/:id/backups/upload",
    { preHandler: requireSuperAdmin },
    async (request) => {
      const { id } = tenantIdParamsSchema.parse(request.params);
      if (!(request.body instanceof Readable))
        throw AppError.validation("Choose a SQL backup file.");
      const encodedName = request.headers["x-cxsun-filename"];
      if (typeof encodedName !== "string")
        throw AppError.validation("Backup filename is required.");
      let fileName: string;
      try {
        fileName = decodeURIComponent(encodedName);
      } catch {
        throw AppError.validation("Backup filename is invalid.");
      }
      return ok(await tenantBackupFiles.upload(id, fileName, request.body), {
        requestId: request.id
      });
    }
  );
  registerContractRoute(app, {
    method: "POST",
    url: "/admin/database/tenants/:id/restore",
    preHandler: requireSuperAdmin,
    schemas: {
      params: tenantIdParamsSchema,
      body: z.object({
        backupRunId: z.number().int().positive(),
        sandboxMode: z.enum(["fresh", "append"]),
        note: z.string().trim().max(240).optional()
      }),
      response: databaseRunSchema.nullable()
    },
    handler: async ({ params, body }) => service.requestTenantRestore(params.id, body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/admin/database/tenants/:id/restores/:runId",
    preHandler: requireSuperAdmin,
    schemas: {
      params: z.object({
        id: z.coerce.number().int().positive(),
        runId: z.coerce.number().int().positive()
      }),
      response: databaseRunSchema
    },
    handler: async ({ params }) => service.tenantRestoreRun(params.id, params.runId)
  });
}

function registerTenantInstallRoute(app: FastifyInstance, operation: "reinstall" | "setup") {
  registerContractRoute(app, {
    method: "POST",
    url: `/admin/database/tenants/:id/${operation}`,
    preHandler: requireSuperAdmin,
    schemas: {
      body: databaseActionSchema,
      params: tenantIdParamsSchema,
      response: databaseRunSchema
    },
    handler: async ({ body, params }) => {
      const run =
        operation === "setup"
          ? await service.setupTenant(params.id, body)
          : await service.reinstallTenant(params.id, body);
      if (!run) throw AppError.notFound("Tenant was not found.");
      return run;
    }
  });
}

function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
