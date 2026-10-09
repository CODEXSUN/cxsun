import { createApiApp, registerHealthRoute, registerRequestLogging } from "@cxsun/framework/api";
import { randomBytes } from "node:crypto";
import { registerModules } from "@cxsun/framework/modules";
import { createMailModule } from "@cxsun/mail-api";
import { accountsApiModuleKeys, registerAccountsApi } from "@cxsun/accounts-api";
import {
  billingApiModuleKeys,
  closeAllBillingDatabases,
  lookupBillingPeriod,
  lookupCustomerOutstanding,
  lookupLongOutstandingSales,
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
  registerContact360Modules,
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
import {
  frappeConnectionModule,
  frappeEnquirySyncModule,
  frappeUserMappingModule,
  mappedEmployeeCodeForLocalUser,
  mappedLocalUserForEmployeeCode,
  frappeUserSyncModule,
  type FrappeDatabase,
  type FrappeUserMappingDatabase
} from "@cxsun/frappe-api";
import { EnquiryRepository, EnquiryService } from "@cxsun/crm-api/enquiry-sync";
import {
  zetroChatModule,
  registerZetroAdminRoutes,
  zetroProviderModule,
  registerZetroProviderAdminRoutes,
  ZetroProviderRepository,
  type ZetroDatabase,
  type ZetroProviderConfig,
  type ZetroProviderDatabase
} from "@cxsun/zetro-api";
import { AppError } from "@cxsun/framework/errors";
import type { FastifyRequest } from "fastify";
import type { HealthCheck } from "@cxsun/framework/health";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { appRegistryModule } from "./modules/app-registry/index.js";
import { tenantDomainModule } from "./modules/tenant-domain/index.js";
import { tenantModule } from "./modules/tenant/index.js";
import { TenantUserService, tenantUserModule } from "./modules/tenant-user/index.js";
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
import { platformReadinessChecks } from "./readiness.js";
import { tenantAccessContext } from "./auth/tenant-access-context.js";
import { recordTenantAccessAudit } from "./database/tenant-access-audit.js";
import { TenantRepository } from "./modules/tenant/tenant.repository.js";
import { getTenantDatabase } from "./database/tenant-database.js";
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
import { registerZunoHost } from "./zuno-host.js";
import { resolvePlatformApiUrl } from "./api-url.js";
import { projectManagerApiModuleKeys } from "@cxsun/project-manager-api";
import { zunoApiModuleKeys } from "@cxsun/zuno-api";
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
    rewriteUrl: resolvePlatformApiUrl,
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
  await registerZunoHost(app);
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
            zetroChatModule.key,
            ...billingApiModuleKeys,
            ...accountsApiModuleKeys,
            ...projectManagerApiModuleKeys,
            ...zunoApiModuleKeys,
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
  registerHealthRoute(app, platformReadinessChecks(queueService), "/ready");
  app.get("/public/runtime-config", async () => ({
    data: {
      VITE_DEV_AUTO_TENANT_LOGIN: env.DEV_AUTO_TENANT_LOGIN,
      VITE_PLATFORM_API_URL: "/api/app",
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
  // Tenant provider settings override this deployment fallback at request time.
  const zetroFallbackProvider: ZetroProviderConfig = {
    apiKey: env.CXSUN_ZETRO_API_KEY,
    baseUrl: env.CXSUN_ZETRO_BASE_URL,
    kind: /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/)/u.test(env.CXSUN_ZETRO_BASE_URL)
      ? "local"
      : "openai",
    model: env.CXSUN_ZETRO_MODEL
  };
  zetroChatModule.register(app, async (request) => {
    const context = tenantAccessContext(request);
    const enabled = await context.database
      .selectFrom("app_module_settings")
      .select("id")
      .where("module_key", "=", "zetro")
      .where("enabled", "=", true)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!enabled) throw AppError.forbidden("Zetro is not enabled for this tenant.");
    await context.authorize("zetro.chat.use");
    const billingLookupScope = async () => {
      const billingEnabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "=", "billing.sales")
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .executeTakeFirst();
      if (!billingEnabled) throw AppError.forbidden("Billing is not enabled for this tenant.");
      const defaults = request.authContext?.session.context.defaultCompany;
      if (!defaults) throw AppError.validation("Select a default company and financial year.");
      return {
        tenantDatabase: context.tenantDatabase,
        actorEmail: context.actorEmail,
        companyId: defaults.companyId,
        financialYearId: defaults.financialYearId
      };
    };
    return {
      actorEmail: context.actorEmail,
      database: context.database as unknown as import("kysely").Kysely<ZetroDatabase>,
      provider: await new ZetroProviderRepository(
        context.database as unknown as import("kysely").Kysely<ZetroProviderDatabase>,
        env.JWT_SECRET,
        context.tenantId,
        zetroFallbackProvider
      ).resolve(),
      lookupOutstanding: async (contact: string) =>
        lookupCustomerOutstanding({ ...(await billingLookupScope()), contact }),
      lookupBillingPeriod: async (period: "today" | "month") =>
        lookupBillingPeriod({ ...(await billingLookupScope()), period }),
      lookupLongOutstandingSales: async () =>
        lookupLongOutstandingSales(await billingLookupScope()),
      audit: (action: string, conversation: import("@cxsun/zetro-api").ZetroConversation) =>
        recordTenantAccessAudit({
          action,
          actorEmail: context.actorEmail,
          moduleKey: "zetro.chat",
          recordId: conversation.id,
          recordLabel: "Zetro conversation",
          recordUuid: conversation.uuid,
          tenantId: context.tenantId
        })
    };
  });
  // Provider routes use the signed tenant context and tenant UUID for local Codex login.
  zetroProviderModule.register(
    app,
    async (request) => {
      const context = tenantAccessContext(request);
      const enabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "=", "zetro")
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .executeTakeFirst();
      if (!enabled) throw AppError.forbidden("Zetro is not enabled for this tenant.");
      await context.authorize("zetro.provider.manage");
      return {
        actorEmail: context.actorEmail,
        database: context.database as unknown as import("kysely").Kysely<ZetroProviderDatabase>,
        tenantId: context.tenantId,
        audit: (action) =>
          recordTenantAccessAudit({
            action:
              action === "device-login"
                ? "zetro.provider.device-login"
                : action === "disconnect"
                  ? "zetro.provider.disconnect"
                  : action === "bind-local"
                    ? "zetro.provider.bind-local"
                    : "zetro.provider.update",
            actorEmail: context.actorEmail,
            moduleKey: "zetro.provider",
            recordId: 1,
            recordLabel: "Zetro provider settings",
            recordUuid: "settings",
            tenantId: context.tenantId
          })
      };
    },
    zetroFallbackProvider,
    env.JWT_SECRET
  );
  registerZetroAdminRoutes(app, async (request, tenantId) => {
    if (request.authContext?.payload.userType !== "super_admin") {
      throw AppError.forbidden("Super Admin permission is required for Zetro review.");
    }
    const tenant = await new TenantRepository().findByIdOrCode(tenantId);
    if (!tenant) throw AppError.notFound("Tenant was not found.");
    const actorEmail = request.authContext.payload.email ?? request.authContext.session.userEmail;
    await recordTenantAccessAudit({
      action: "zetro.admin.access",
      actorEmail,
      moduleKey: "zetro.chat",
      recordId: tenant.id,
      recordLabel: "Zetro tenant review",
      recordUuid: tenant.uuid,
      tenantId: tenant.uuid
    });
    return {
      actorEmail,
      database: getTenantDatabase(tenant) as unknown as import("kysely").Kysely<ZetroDatabase>
    };
  });
  registerZetroProviderAdminRoutes(
    app,
    async (request, tenantId) => {
      if (request.authContext?.payload.userType !== "super_admin") {
        throw AppError.forbidden("Super Admin permission is required for Zetro settings.");
      }
      const tenant = await new TenantRepository().findByIdOrCode(tenantId);
      if (!tenant) throw AppError.notFound("Tenant was not found.");
      if (!tenant.enabledModuleKeys.includes("zetro")) {
        throw AppError.forbidden("Zetro is not enabled for this tenant.");
      }
      const actorEmail = request.authContext.payload.email ?? request.authContext.session.userEmail;
      await recordTenantAccessAudit({
        action: "zetro.provider.admin.access",
        actorEmail,
        moduleKey: "zetro.provider",
        recordId: tenant.id,
        recordLabel: "Zetro provider settings",
        recordUuid: tenant.uuid,
        tenantId: tenant.uuid
      });
      return {
        actorEmail,
        database: getTenantDatabase(
          tenant
        ) as unknown as import("kysely").Kysely<ZetroProviderDatabase>,
        tenantId: tenant.uuid,
        audit: () =>
          recordTenantAccessAudit({
            action: "zetro.provider.admin.update",
            actorEmail,
            moduleKey: "zetro.provider",
            recordId: tenant.id,
            recordLabel: "Zetro provider settings",
            recordUuid: tenant.uuid,
            tenantId: tenant.uuid
          })
      };
    },
    zetroFallbackProvider,
    env.JWT_SECRET
  );
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
    const path = request.url.split("?")[0] ?? "";
    const action =
      request.method === "GET" || /^\/crm\/enquiries\/alerts\/\d+\/read$/u.test(path)
        ? "view"
        : request.method === "DELETE"
          ? "delete"
          : request.method === "POST" && request.url.split("?")[0] === collection
            ? "create"
            : "update";
    if (action === "view" && ["list-in", "status", "priority"].includes(resource)) {
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
  const enquiryRelations = (context: ReturnType<typeof tenantAccessContext>) => ({
    contact: (id: number) => getActiveContactForDatabase(context.tenantDatabase, id),
    resolveOrCreateCustomer: (input: { name: string | null; mobile: string | null }) =>
      resolveOrCreateCustomerForDatabase(context.tenantDatabase, input),
    user: async (id: number) =>
      (await context.database
        .selectFrom("app_users")
        .select("name")
        .where("id", "=", id)
        .where("status", "=", "active")
        .executeTakeFirst()) ?? null,
    listIn: (id: number) =>
      getActiveListInForDatabase(
        context.database as unknown as import("kysely").Kysely<ListInDatabase>,
        id
      ),
    status: (id: number) =>
      getActiveStatusForDatabase(
        context.database as unknown as import("kysely").Kysely<StatusDatabase>,
        id
      ),
    priority: (id: number) =>
      getActivePriorityForDatabase(
        context.database as unknown as import("kysely").Kysely<PriorityDatabase>,
        id
      )
  });
  await enquiryModule.register(app, async (request) => {
    const context = await crmAccess(request, "enquiry", "/crm/enquiries");
    const actor = await context.database
      .selectFrom("app_users")
      .select("id")
      .where("email", "=", context.actorEmail)
      .where("status", "=", "active")
      .executeTakeFirst();
    let canViewAll = false;
    try {
      await context.authorize("crm.enquiry.view-all");
      canViewAll = true;
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "FORBIDDEN") throw error;
    }
    return {
      actorEmail: context.actorEmail,
      actorUserId: actor?.id ?? null,
      canViewAll,
      database: context.database as unknown as import("kysely").Kysely<EnquiryDatabase>,
      relations: enquiryRelations(context)
    };
  });
  registerContact360Modules(app, async (request, resource) => {
    const context = await crmAccess(request, resource, `/crm/${resource}`);
    return {
      database: context.database as unknown as import("kysely").Kysely<EnquiryDatabase>,
      actorEmail: context.actorEmail,
      customerExists: async (id: number) =>
        Boolean(await getActiveContactForDatabase(context.tenantDatabase, id)),
      industryExists: async (id: number) =>
        Boolean(await industryService.resolveActiveIndustryName(id))
    };
  });
  frappeConnectionModule.register(
    app,
    async (request) => {
      const context = tenantAccessContext(request);
      const enabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "in", ["crm", "frappe"])
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .execute();
      if (enabled.length !== 2)
        throw AppError.forbidden("CRM and Frappe must be enabled for this tenant.");
      const path = request.url.split("?")[0] ?? "";
      const permission =
        path.startsWith("/frappe/connection") && request.method !== "GET"
          ? "frappe.connection.manage"
          : request.method === "POST" && path.endsWith("/sync")
            ? "crm.enquiry.update"
            : "crm.enquiry.view";
      await context.authorize(permission);
      const actor = await context.database
        .selectFrom("app_users")
        .select("id")
        .where("email", "=", context.actorEmail)
        .where("status", "=", "active")
        .executeTakeFirst();
      let canViewAll = false;
      try {
        await context.authorize("crm.enquiry.view-all");
        canViewAll = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== "FORBIDDEN") throw error;
      }
      return {
        database: context.database as unknown as import("kysely").Kysely<FrappeDatabase>,
        viewer: { actorEmail: context.actorEmail, actorUserId: actor?.id ?? null, canViewAll },
        mappedEmployeeCode: (localEmail: string, baseUrl: string) =>
          mappedEmployeeCodeForLocalUser(
            context.database as unknown as import("kysely").Kysely<FrappeUserMappingDatabase>,
            localEmail,
            baseUrl
          ),
        loadEnquiry: async (id: number) => {
          const repository = new EnquiryRepository(
            context.database as unknown as import("kysely").Kysely<EnquiryDatabase>
          );
          const record = await repository.get(id);
          if (!record) throw AppError.notFound("Local enquiry was not found.");
          if (
            !canViewAll &&
            record.createdBy.toLowerCase() !== context.actorEmail.toLowerCase() &&
            record.assignedUserId !== actor?.id
          ) {
            await context.authorize("crm.enquiry.view-all");
          }
          return record;
        }
      };
    },
    {
      baseUrl: env.CXSUN_FRAPPE_BASE_URL,
      apiKey: env.CXSUN_FRAPPE_APP_KEY,
      apiSecret: env.CXSUN_FRAPPE_APP_SECRET,
      enabled: env.CXSUN_FRAPPE_ENABLED === "1"
    },
    env.JWT_SECRET
  );
  frappeEnquirySyncModule.register(
    app,
    async (request) => {
      const context = tenantAccessContext(request);
      const enabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "in", ["crm", "frappe"])
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .execute();
      if (enabled.length !== 2)
        throw AppError.forbidden("CRM and Frappe must be enabled for this tenant.");
      await context.authorize("frappe.connection.manage");
      await context.authorize("crm.enquiry.view-all");
      if (request.method === "POST") {
        await context.authorize("crm.enquiry.create");
        await context.authorize("crm.enquiry.update");
      }
      const database = context.database as unknown as import("kysely").Kysely<EnquiryDatabase>;
      const enquiries = new EnquiryService(
        new EnquiryRepository(database),
        enquiryRelations(context),
        { actorEmail: context.actorEmail, actorUserId: null, canViewAll: true }
      );
      return {
        database: context.database as unknown as import("kysely").Kysely<FrappeDatabase>,
        createEnquiry: (input: import("@cxsun/crm-api/enquiry-sync").EnquiryInput) =>
          enquiries.create(input, context.actorEmail),
        updateEnquiry: (id: number, input: import("@cxsun/crm-api/enquiry-sync").EnquiryInput) =>
          enquiries.update(id, input, context.actorEmail),
        localUserForEmployee: (employeeCode: string, baseUrl: string) =>
          mappedLocalUserForEmployeeCode(
            context.database as unknown as import("kysely").Kysely<FrappeUserMappingDatabase>,
            employeeCode,
            baseUrl
          )
      };
    },
    {
      baseUrl: env.CXSUN_FRAPPE_BASE_URL,
      apiKey: env.CXSUN_FRAPPE_APP_KEY,
      apiSecret: env.CXSUN_FRAPPE_APP_SECRET,
      enabled: env.CXSUN_FRAPPE_ENABLED === "1"
    },
    env.JWT_SECRET
  );
  frappeUserSyncModule.register(
    app,
    async (request) => {
      const context = tenantAccessContext(request);
      const enabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "=", "frappe")
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .executeTakeFirst();
      if (!enabled) throw AppError.forbidden("Frappe must be enabled for this tenant.");
      await context.authorize("frappe.connection.manage");
      const users = new TenantUserService(context);
      return {
        database: context.database as unknown as import("kysely").Kysely<FrappeDatabase>,
        localUsers: async () =>
          (await users.list()).map(({ id, email, status }) => ({ id, email, status })),
        importUser: (user: { name: string; email: string; password?: string }) =>
          users.importFromFrappe(user)
      };
    },
    {
      baseUrl: env.CXSUN_FRAPPE_BASE_URL,
      apiKey: env.CXSUN_FRAPPE_APP_KEY,
      apiSecret: env.CXSUN_FRAPPE_APP_SECRET,
      enabled: env.CXSUN_FRAPPE_ENABLED === "1"
    },
    env.JWT_SECRET
  );
  frappeUserMappingModule.register(
    app,
    async (request) => {
      const context = tenantAccessContext(request);
      const enabled = await context.database
        .selectFrom("app_module_settings")
        .select("id")
        .where("module_key", "=", "frappe")
        .where("enabled", "=", true)
        .where("status", "=", "active")
        .executeTakeFirst();
      if (!enabled) throw AppError.forbidden("Frappe must be enabled for this tenant.");
      await context.authorize("frappe.connection.manage");
      const users = new TenantUserService(context);
      return {
        database: context.database as unknown as import("kysely").Kysely<FrappeUserMappingDatabase>,
        localUsers: async () =>
          (await users.list()).map(({ id, uuid, name, email, status }) => ({
            id,
            uuid,
            name,
            email,
            status
          })),
        audit: (
          action: "linked" | "updated" | "unlinked",
          user: { id: number; uuid: string; name: string },
          remoteId: string
        ) =>
          recordTenantAccessAudit({
            action,
            actorEmail: context.actorEmail,
            moduleKey: "frappe.user-mapping",
            recordId: user.id,
            recordLabel: `${user.name} -> ${remoteId}`,
            recordUuid: user.uuid,
            tenantId: context.tenantId
          })
      };
    },
    {
      baseUrl: env.CXSUN_FRAPPE_BASE_URL,
      apiKey: env.CXSUN_FRAPPE_APP_KEY,
      apiSecret: env.CXSUN_FRAPPE_APP_SECRET,
      enabled: env.CXSUN_FRAPPE_ENABLED === "1"
    },
    env.JWT_SECRET
  );
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
