import { createApiApp, registerHealthRoute, registerRequestLogging } from "@cxsun/framework/api";
import { randomBytes } from "node:crypto";
import { registerModules } from "@cxsun/framework/modules";
import { createMailModule } from "@cxsun/mail-api";
import { accountsApiModuleKeys, registerAccountsApi } from "@cxsun/accounts-api";
import {
  billingApiModuleKeys,
  closeAllBillingDatabases,
  registerBillingApi
} from "@cxsun/billing-api";
import {
  closeCoreDatabase,
  coreApiModuleKeys,
  registerCoreApi,
  getActiveContactForDatabase,
  resolveOrCreateCustomerForDatabase
} from "@cxsun/core-api";
import {
  enquiryModule,
  listInModule,
  statusModule,
  priorityModule,
  getActiveListInForDatabase,
  getActiveStatusForDatabase,
  getActivePriorityForDatabase,
  type EnquiryDatabase,
  type ListInDatabase,
  type StatusDatabase,
  type PriorityDatabase
} from "@cxsun/crm-api";
import { auditorClientModule, type AuditorClientDatabase } from "@cxsun/auditor-api";
import { AppError } from "@cxsun/framework/errors";
import type { FastifyRequest } from "fastify";
import type { HealthCheck } from "@cxsun/framework/health";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { appRegistryModule } from "./modules/app-registry/index.js";
import { tenantDomainModule } from "./modules/tenant-domain/index.js";
import { tenantModule } from "./modules/tenant/index.js";
import { tenantUserModule } from "./modules/tenant-user/index.js";
import { tenantRoleModule } from "./modules/tenant-role/index.js";
import { tenantPermissionModule } from "./modules/tenant-permission/index.js";
import { tenantUserRoleModule } from "./modules/tenant-user-role/index.js";
import { tenantRolePermissionModule } from "./modules/tenant-role-permission/index.js";
import { planModule } from "./modules/plan/index.js";
import { subscriptionModule } from "./modules/subscription/index.js";
import { IndustryService, industryModule } from "./modules/industry/index.js";
import { entitlementModule } from "./modules/entitlement/index.js";
import { accessControlModule } from "./modules/access-control/index.js";
import { platformActivityModule } from "./modules/platform-activity/index.js";
import { databaseMaintenanceModule } from "./modules/database-maintenance/index.js";
import { queueManagerModule } from "./modules/queue-manager/index.js";
import { storageManagerModule } from "./modules/storage-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { credentialRecoveryModule } from "./modules/credential-recovery/index.js";
import { appOrchestrationModule } from "./modules/app-orchestration/index.js";
import { startQueueManagerWorker } from "./modules/queue-manager/queue-manager.runtime.js";
import { QueueManagerService } from "./modules/queue-manager/queue-manager.service.js";
import { tenantAccessContext } from "./auth/tenant-access-context.js";
import { seedDefaultTenant } from "./modules/tenant/tenant.seed.js";
import { env } from "./env.js";
import { assertSingleTenantRegistry } from "./tenancy-mode.js";
import {
  bootstrapPlatformDatabase,
  closePlatformDatabase,
  getPlatformDatabase
} from "./database/platform-database.js";
import { closeAllTenantDatabases } from "./database/tenant-database.js";
import { registerAuthRequestContext } from "./auth/auth-request-context.js";
import { TenantDomainRepository } from "./modules/tenant-domain/tenant-domain.repository.js";
import { registerProjectManagerHost } from "./project-manager-host.js";
import { projectManagerApiModuleKeys } from "@cxsun/project-manager-api";
import {
  addonApiModuleKeys,
  activePlatformAddons,
  closePlatformAddons,
  registerPlatformAddons
} from "./addon-host.js";

export async function createApp() {
  console.info("[platform.boot] bootstrap started");
  await bootstrapPlatformDatabase();
  await assertSingleTenantRegistry(true);
  await seedDefaultTenant();
  await assertSingleTenantRegistry(false);

  const app = await createApiApp({
    appName: "CODEXSUN Platform API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: await platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [
      async () => {
        console.info("[shutdown] closing Billing tenant MariaDB pools");
        await closeAllBillingDatabases();
      },
      async () => {
        console.info("[shutdown] closing Core tenant MariaDB pools");
        await closeCoreDatabase();
      },
      async () => {
        console.info("[shutdown] closing tenant MariaDB pools");
        await closeAllTenantDatabases();
      },
      async () => {
        console.info("[shutdown] closing platform MariaDB pools");
        await closePlatformDatabase();
      },
      async () => {
        console.info("[shutdown] closing add-on runtimes");
        await closePlatformAddons();
      }
    ]
  });
  const queueService = new QueueManagerService();
  registerAuthRequestContext(app);
  await registerProjectManagerHost(app);
  console.info("[platform.routes] Project Manager package ready");
  const mailModule = createMailModule({
    enqueue: (payload) => queueService.enqueue(payload),
    resolveContext: mailContext,
    secretKey: env.JWT_SECRET
  });

  const healthChecks: HealthCheck[] = [
    {
      name: "platform-api",
      check: () => ({
        details: {
          modules: [
            ...coreApiModuleKeys,
            enquiryModule.key,
            auditorClientModule.key,
            ...billingApiModuleKeys,
            ...accountsApiModuleKeys,
            ...projectManagerApiModuleKeys,
            ...addonApiModuleKeys,
            appRegistryModule.key,
            tenantModule.key,
            tenantUserModule.key,
            tenantRoleModule.key,
            tenantPermissionModule.key,
            tenantUserRoleModule.key,
            tenantRolePermissionModule.key,
            tenantDomainModule.key,
            planModule.key,
            subscriptionModule.key,
            industryModule.key,
            entitlementModule.key,
            accessControlModule.key,
            platformActivityModule.key,
            databaseMaintenanceModule.key,
            queueManagerModule.key,
            credentialRecoveryModule.key,
            storageManagerModule.key,
            taskManagerModule.key,
            appOrchestrationModule.key,
            mailModule.key
          ],
          addons: activePlatformAddons(),
          runtime: "platform-foundation"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  app.get("/public/runtime-config", async () => ({
    data: {
      VITE_DEV_AUTO_TENANT_LOGIN: env.DEV_AUTO_TENANT_LOGIN,
      VITE_PLATFORM_API_URL: "/api/platform",
      VITE_TENANT_NAME: env.DEFAULT_TENANT_NAME,
      VITE_TENANCY_MODE: env.CXSUN_TENANCY_MODE
    },
    success: true
  }));
  console.info("[platform.routes] health ready");
  await registerAuthRoutes(app);
  console.info("[platform.routes] auth ready");
  const industryService = new IndustryService();
  await registerCoreApi(app, {
    resolveIndustryName: (industryId) => industryService.resolveActiveIndustryName(industryId)
  });
  console.info("[platform.routes] Core package ready");
  const crmAccess = async (request: FastifyRequest, resource: string, collection: string) => {
    const context = tenantAccessContext(request);
    const enabled = await context.database
      .selectFrom("app_module_settings")
      .select("id")
      .where("module_key", "=", "crm")
      .where("enabled", "=", true)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!enabled) throw AppError.forbidden("CRM is not enabled for this tenant.");
    const action = request.method === "GET" ? "view" : request.method === "DELETE" ? "delete"
      : request.method === "POST" && request.url.split("?")[0] === collection ? "create" : "update";
    if (action === "view" && resource !== "enquiry") {
      try {
        await context.authorize(`crm.${resource}.view`);
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== "FORBIDDEN") throw error;
        await context.authorize("crm.enquiry.view");
      }
    } else {
      await context.authorize(`crm.${resource}.${action}`);
    }
    return context;
  };
  await listInModule.register(app, async (request) => {
    const context = await crmAccess(request, "list-in", "/crm/list-in");
    return {
      actorEmail: context.actorEmail,
      database: context.database as unknown as import("kysely").Kysely<ListInDatabase>
    };
  });
  await statusModule.register(app, async (request) => {
    const context = await crmAccess(request, "status", "/crm/statuses");
    return {
      actorEmail: context.actorEmail,
      database: context.database as unknown as import("kysely").Kysely<StatusDatabase>
    };
  });
  await priorityModule.register(app, async (request) => {
    const context = await crmAccess(request, "priority", "/crm/priorities");
    return {
      actorEmail: context.actorEmail,
      database: context.database as unknown as import("kysely").Kysely<PriorityDatabase>
    };
  });
  await enquiryModule.register(app, async (request) => {
    const context = await crmAccess(request, "enquiry", "/crm/enquiries");
    return {
      actorEmail: context.actorEmail,
      database: context.database as unknown as import("kysely").Kysely<EnquiryDatabase>,
      relations: {
        contact: (id: number) => getActiveContactForDatabase(context.tenantDatabase, id),
        resolveOrCreateCustomer: (input) =>
          resolveOrCreateCustomerForDatabase(context.tenantDatabase, input),
        user: async (id: number) =>
          (await context.database
            .selectFrom("app_users")
            .select("name")
            .where("id", "=", id)
            .where("status", "=", "active")
            .executeTakeFirst()) ?? null,
        listIn: (id: number) => getActiveListInForDatabase(
          context.database as unknown as import("kysely").Kysely<ListInDatabase>, id),
        status: (id: number) => getActiveStatusForDatabase(
          context.database as unknown as import("kysely").Kysely<StatusDatabase>, id),
        priority: (id: number) => getActivePriorityForDatabase(
          context.database as unknown as import("kysely").Kysely<PriorityDatabase>, id)
      }
    };
  });
  console.info("[platform.routes] CRM package ready");
  await auditorClientModule.register(app, async (request) => {
    const context = tenantAccessContext(request);
    const enabled = await context.database
      .selectFrom("app_module_settings")
      .select("id")
      .where("module_key", "=", "auditor")
      .where("enabled", "=", true)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!enabled) throw AppError.forbidden("Auditor is not enabled for this tenant.");
    return {
      actorEmail: context.actorEmail,
      authorize: context.authorize,
      database: context.database as unknown as import("kysely").Kysely<AuditorClientDatabase>,
      secretKey: env.JWT_SECRET,
      audit: async (action, record) => {
        await writeAuditorAuditEvent(
          context.tenantId,
          context.actorEmail,
          `auditor.client.${action}:${record.id}`
        );
        request.log.info(
          { action, actorEmail: context.actorEmail, clientId: record.id, module: "auditor.client" },
          "Auditor client changed"
        );
      },
      auditCredential: async (action, clientId, portal) => {
        await writeAuditorAuditEvent(
          context.tenantId,
          context.actorEmail,
          `auditor.client.credentials.${action}:${clientId}:${portal}`
        );
        request.log.info(
          {
            action,
            actorEmail: context.actorEmail,
            clientId,
            portal,
            module: "auditor.client.credentials"
          },
          "Auditor client credential accessed"
        );
      }
    };
  });
  console.info("[platform.routes] Auditor package ready");
  await registerBillingApi(app);
  console.info("[platform.routes] Billing package ready");
  await registerAccountsApi(app);
  console.info("[platform.routes] Accounts package ready");
  await registerPlatformAddons(app);
  console.info("[platform.routes] add-on packages ready");
  await registerModules(
    [
      appRegistryModule,
      tenantModule,
      tenantUserModule,
      tenantRoleModule,
      tenantPermissionModule,
      tenantUserRoleModule,
      tenantRolePermissionModule,
      tenantDomainModule,
      planModule,
      subscriptionModule,
      industryModule,
      entitlementModule,
      accessControlModule,
      platformActivityModule,
      databaseMaintenanceModule,
      queueManagerModule,
      credentialRecoveryModule,
      storageManagerModule,
      taskManagerModule,
      appOrchestrationModule,
      mailModule
    ],
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  startQueueManagerWorker(app, queueService);
  console.info("[platform.worker] queue manager ready");
  console.info("[platform.boot] bootstrap completed");

  return app;
}

async function writeAuditorAuditEvent(tenantUuid: string, actorEmail: string, eventName: string) {
  const database = getPlatformDatabase();
  const tenant = await database
    .selectFrom("tenants")
    .select("id")
    .where("uuid", "=", tenantUuid)
    .executeTakeFirstOrThrow();
  await database
    .insertInto("tenant_audit_events")
    .values({
      actor_email: actorEmail,
      event_name: eventName,
      tenant_id: tenant.id,
      uuid: randomBytes(4).toString("hex")
    })
    .execute();
}

async function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN];
  const verifiedDomains = (await new TenantDomainRepository().listAll())
    .filter((domain) => domain.status === "active" && domain.verificationStatus === "verified")
    .map((domain) => `https://${domain.domain}`);
  configuredOrigins.push(...verifiedDomains);
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}

async function mailContext(request: FastifyRequest) {
  const context = tenantAccessContext(request);
  const header = request.headers["x-company-id"];
  const companyId = Number(Array.isArray(header) ? header[0] : header);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw AppError.validation("x-company-id is required for Mail access.");
  }
  return { ...context, companyId, database: context.database as never };
}
