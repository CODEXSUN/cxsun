import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  AppWindowIcon,
  Building2Icon,
  CircleGaugeIcon,
  CreditCardIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  ListChecksIcon,
  PaletteIcon,
  SearchCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon
} from "lucide-react";
import { SuperLayout } from "@cxsun/ui/layouts/super-layout";
import type { SidemenuItem } from "@cxsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { GlobalLoader } from "@cxsun/ui/components/global-loader";
import { AppOperationsStrip } from "../../modules/app-orchestration/app-orchestration.list";
import { useAppOperationsQuery } from "../../modules/app-orchestration/app-orchestration.hooks";
import type { OrchestratedAppId } from "../../modules/app-orchestration/app-orchestration.types";
import { logout } from "../../shared/api/platform-api";
import { AuthGate } from "../../shared/auth/AuthGate";
import { requiredClientEnv } from "../../shared/env/client-env";
import { ProjectManagerWorkspaceHost } from "@cxsun/project-manager-web";

const ZunoWorkspace = lazyWorkspace(() =>
  import("@cxsun/zuno-web").then((module) => module.ZunoWorkspace)
);
const ZetroAdminWorkspace = lazyWorkspace(() =>
  import("@cxsun/zetro-web/modules/admin").then((module) => module.ZetroAdminWorkspace)
);

function lazyWorkspace<Props>(loader: () => Promise<ComponentType<Props>>) {
  return lazy(async () => ({ default: await loader() }));
}

const DesignSystemGallery = lazyWorkspace(() =>
  import("../../modules/design-system").then((module) => module.DesignSystemGallery)
);
const UiuxGallery = lazyWorkspace(() => import("@cxsun/uiux").then((module) => module.UiuxGallery));
const TenantList = lazyWorkspace(() =>
  import("../../modules/tenant").then((module) => module.TenantList)
);
const TenantDomainList = lazyWorkspace(() =>
  import("../../modules/tenant-domain").then((module) => module.TenantDomainList)
);
const PlanWorkspace = lazyWorkspace(() =>
  import("../../modules/plan").then((module) => module.PlanWorkspace)
);
const SubscriptionWorkspace = lazyWorkspace(() =>
  import("../../modules/subscription").then((module) => module.SubscriptionWorkspace)
);
const AppRegistryWorkspace = lazyWorkspace(() =>
  import("../../modules/app-registry").then((module) => module.AppRegistryWorkspace)
);
const IndustryWorkspace = lazyWorkspace(() =>
  import("../../modules/industry").then((module) => module.IndustryWorkspace)
);
const EntitlementWorkspace = lazyWorkspace(() =>
  import("../../modules/entitlement").then((module) => module.EntitlementWorkspace)
);
const PlanAccessWorkspace = lazyWorkspace(() =>
  import("../../modules/plan-access").then((module) => module.PlanAccessWorkspace)
);
const TenantAccessWorkspace = lazyWorkspace(() =>
  import("../../modules/tenant-access").then((module) => module.TenantAccessWorkspace)
);
const TenantUserWorkspace = lazyWorkspace(() =>
  import("../../modules/tenant-user").then((module) => module.TenantUserWorkspace)
);
const AccessControlWorkspace = lazyWorkspace(() =>
  import("../../modules/access-control").then((module) => module.AccessControlWorkspace)
);
const PlatformActivityWorkspace = lazyWorkspace(() =>
  import("../../modules/platform-activity").then((module) => module.PlatformActivityWorkspace)
);
const MasterDatabaseWorkspace = lazyWorkspace(() =>
  import("../../modules/master-database").then((module) => module.MasterDatabaseWorkspace)
);
const MasterDatabaseBackupsWorkspace = lazyWorkspace(() =>
  import("../../modules/master-database").then((module) => module.MasterDatabaseBackupsWorkspace)
);
const TenantDatabaseWorkspace = lazyWorkspace(() =>
  import("../../modules/tenant-database").then((module) => module.TenantDatabaseWorkspace)
);
const TenantDatabaseBackupsRoute = lazyWorkspace(() =>
  import("../../modules/tenant-database").then((module) => module.TenantDatabaseBackupsRoute)
);
const QueueManagementWorkspace = lazyWorkspace(() =>
  import("../../modules/queue-management").then((module) => module.QueueManagementWorkspace)
);
const StorageManagerWorkspace = lazyWorkspace(() =>
  import("../../modules/storage-manager").then((module) => module.StorageManagerWorkspace)
);
const TaskManagerWorkspace = lazyWorkspace(() =>
  import("../../modules/task-manager").then((module) => module.TaskManagerWorkspace)
);
const AppOrchestrationWorkspace = lazyWorkspace(() =>
  import("../../modules/app-orchestration/app-orchestration.workspace").then(
    (module) => module.AppOrchestrationWorkspace
  )
);

type SaPage =
  | "overview"
  | "app-operations"
  | "task-manager"
  | "project-manager-registry"
  | "project-manager-ideas"
  | "zuno"
  | "zetro"
  | "tenants"
  | "domains"
  | "plans"
  | "plan-access"
  | "subscriptions"
  | "apps"
  | "entitlements"
  | "tenant-access"
  | "tenant-users"
  | "industries"
  | "master-database"
  | "master-backups"
  | "tenant-database"
  | "tenant-backups"
  | "queue-management"
  | "storage-manager"
  | "access"
  | "activity"
  | "uiux"
  | "design-system";

export function SaDesk() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageFromUrl(location.pathname);
  const selectedAppId: OrchestratedAppId = "platform";

  useEffect(() => {
    const canonicalPath = page === "overview" ? "/sa" : `/sa/${page}`;
    if (location.pathname !== canonicalPath) void navigate({ to: canonicalPath, replace: true });
  }, [location.pathname, navigate, page]);

  function selectPage(nextPage: SaPage) {
    const path = nextPage === "overview" ? "/sa" : `/sa/${nextPage}`;
    void navigate({ to: path, search: {} });
  }

  function openTenantBackups(tenantId: number) {
    void navigate({
      params: { _splat: "tenant-backups" },
      search: { tenant: tenantId },
      to: "/sa/$"
    });
  }

  function openAppOperations(appId: OrchestratedAppId) {
    void navigate({
      params: { _splat: "app-operations" },
      search: { app: appId },
      to: "/sa/$"
    });
  }

  async function handleLogout() {
    await logout("sa");
    window.location.assign("/sa/login");
  }

  const menuItems: SidemenuItem[] = [
    {
      title: "Overview",
      icon: CircleGaugeIcon,
      isActive: page === "overview",
      onSelect: () => selectPage("overview")
    },
    {
      title: "Task Manager",
      icon: ListChecksIcon,
      isActive: page === "task-manager",
      onSelect: () => selectPage("task-manager")
    },
    {
      title: "Project Manager",
      icon: FolderKanbanIcon,
      isActive: page.startsWith("project-manager-"),
      items: [
        {
          title: "Ideas",
          isActive: page === "project-manager-ideas",
          onSelect: () => selectPage("project-manager-ideas")
        },
        {
          title: "Platform Registry",
          isActive: page === "project-manager-registry",
          onSelect: () => selectPage("project-manager-registry")
        }
      ]
    },
    {
      title: "Zuno",
      icon: SearchCodeIcon,
      isActive: page === "zuno",
      onSelect: () => selectPage("zuno")
    },
    {
      title: "Zetro",
      icon: SparklesIcon,
      isActive: page === "zetro",
      onSelect: () => selectPage("zetro")
    },
    {
      title: "Operations",
      icon: WorkflowIcon,
      isActive: page === "queue-management",
      items: [
        {
          title: "Queue Management",
          isActive: page === "queue-management",
          onSelect: () => selectPage("queue-management")
        }
      ]
    },
    {
      title: "Tenant Setup",
      icon: Building2Icon,
      isActive:
        page === "tenants" ||
        page === "domains" ||
        page === "tenant-access" ||
        page === "tenant-users",
      items: [
        {
          title: requiredClientEnv("VITE_TENANCY_MODE") === "single" ? "Client" : "Tenants",
          isActive: page === "tenants",
          onSelect: () => selectPage("tenants")
        },
        { title: "Domains", isActive: page === "domains", onSelect: () => selectPage("domains") },
        {
          title: "Tenant Access",
          isActive: page === "tenant-access",
          onSelect: () => selectPage("tenant-access")
        },
        {
          title: "User Manager",
          icon: UsersIcon,
          isActive: page === "tenant-users",
          onSelect: () => selectPage("tenant-users")
        }
      ]
    },
    {
      title: "Commercial",
      icon: CreditCardIcon,
      isActive: page === "plans" || page === "plan-access" || page === "subscriptions",
      items: [
        { title: "Plans", isActive: page === "plans", onSelect: () => selectPage("plans") },
        {
          title: "Plan Access",
          isActive: page === "plan-access",
          onSelect: () => selectPage("plan-access")
        },
        {
          title: "Subscriptions",
          isActive: page === "subscriptions",
          onSelect: () => selectPage("subscriptions")
        }
      ]
    },
    {
      title: "Catalog",
      icon: AppWindowIcon,
      isActive: page === "apps" || page === "industries",
      items: [
        { title: "Apps", isActive: page === "apps", onSelect: () => selectPage("apps") },
        {
          title: "Industries",
          isActive: page === "industries",
          onSelect: () => selectPage("industries")
        }
      ]
    },
    {
      title: "Governance",
      icon: ShieldCheckIcon,
      isActive: page === "entitlements" || page === "access" || page === "activity",
      items: [
        {
          title: "Entitlements",
          isActive: page === "entitlements",
          onSelect: () => selectPage("entitlements")
        },
        {
          title: "Access Control",
          isActive: page === "access",
          onSelect: () => selectPage("access")
        },
        { title: "Activity", isActive: page === "activity", onSelect: () => selectPage("activity") }
      ]
    },
    {
      title: "Database",
      icon: DatabaseIcon,
      isActive:
        page === "master-database" ||
        page === "master-backups" ||
        page === "tenant-database" ||
        page === "tenant-backups" ||
        page === "storage-manager",
      items: [
        {
          title: "Master Database",
          isActive: page === "master-database",
          onSelect: () => selectPage("master-database")
        },
        {
          title: "Backup & Restore",
          isActive: page === "master-backups",
          onSelect: () => selectPage("master-backups")
        },
        {
          title: "Tenant Databases",
          isActive: page === "tenant-database",
          onSelect: () => selectPage("tenant-database")
        },
        {
          title: "Tenant Backup & Restore",
          isActive: page === "tenant-backups",
          onSelect: () => selectPage("tenant-backups")
        },
        {
          title: "Storage Manager",
          isActive: page === "storage-manager",
          onSelect: () => selectPage("storage-manager")
        }
      ]
    },
    {
      title: "Design System",
      icon: PaletteIcon,
      isActive: page === "design-system" || page === "uiux",
      items: [
        {
          title: "UIUX Gallery",
          isActive: page === "uiux",
          onSelect: () => selectPage("uiux")
        },
        {
          title: "Components",
          isActive: page === "design-system",
          onSelect: () => selectPage("design-system")
        }
      ]
    }
  ];

  return (
    <AuthGate desk="sa">
      {page === "uiux" ? (
        <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
          <UiuxGallery componentCatalogHref="/sa/design-system" deskRoutesAvailable />
        </Suspense>
      ) : (
        <SuperLayout
          homeHref="/"
          menuItems={menuItems}
          onLogout={handleLogout}
          versionLabel={`v ${__APP_VERSION__}`}
          workspace={page === "task-manager" ? "task-manager" : "platform"}
        >
          <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
            {page === "overview" ? <SaOverview onOpenApp={openAppOperations} /> : null}
            {page === "app-operations" ? (
              <AppOrchestrationWorkspace
                appId={selectedAppId}
                onBack={() => selectPage("overview")}
              />
            ) : null}
            {page === "task-manager" ? <TaskManagerWorkspace /> : null}
            {page === "zuno" ? <ZunoWorkspace /> : null}
            {page === "zetro" ? <ZetroAdminWorkspace /> : null}
            {page.startsWith("project-manager-") ? (
              <ProjectManagerWorkspaceHost workspaceId={page.slice("project-manager-".length)} />
            ) : null}
            {page === "tenants" ? <TenantList onBack={() => selectPage("overview")} /> : null}
            {page === "domains" ? <TenantDomainList /> : null}
            {page === "plans" ? <PlanWorkspace /> : null}
            {page === "plan-access" ? <PlanAccessWorkspace /> : null}
            {page === "subscriptions" ? <SubscriptionWorkspace /> : null}
            {page === "apps" ? <AppRegistryWorkspace /> : null}
            {page === "entitlements" ? <EntitlementWorkspace /> : null}
            {page === "tenant-access" ? <TenantAccessWorkspace /> : null}
            {page === "tenant-users" ? <TenantUserWorkspace mode="super-admin" /> : null}
            {page === "industries" ? <IndustryWorkspace /> : null}
            {page === "master-database" ? (
              <MasterDatabaseWorkspace onOpenBackups={() => selectPage("master-backups")} />
            ) : null}
            {page === "master-backups" ? (
              <MasterDatabaseBackupsWorkspace onBack={() => selectPage("master-database")} />
            ) : null}
            {page === "tenant-database" ? (
              <TenantDatabaseWorkspace onOpenBackups={openTenantBackups} />
            ) : null}
            {page === "tenant-backups" ? (
              <TenantDatabaseBackupsRoute onBack={() => selectPage("tenant-database")} />
            ) : null}
            {page === "queue-management" ? <QueueManagementWorkspace /> : null}
            {page === "storage-manager" ? <StorageManagerWorkspace /> : null}
            {page === "access" ? <AccessControlWorkspace /> : null}
            {page === "activity" ? <PlatformActivityWorkspace /> : null}
            {page === "design-system" ? <DesignSystemGallery /> : null}
          </Suspense>
        </SuperLayout>
      )}
    </AuthGate>
  );
}

function pageFromUrl(pathname: string): SaPage {
  const page = pathname.split("/")[2];
  return page === "app-operations" ||
    page === "task-manager" ||
    page === "project-manager-registry" ||
    page === "project-manager-ideas" ||
    page === "zuno" ||
    page === "zetro" ||
    page === "tenants" ||
    page === "domains" ||
    page === "plans" ||
    page === "plan-access" ||
    page === "subscriptions" ||
    page === "apps" ||
    page === "entitlements" ||
    page === "tenant-access" ||
    page === "tenant-users" ||
    page === "industries" ||
    page === "master-database" ||
    page === "master-backups" ||
    page === "tenant-database" ||
    page === "tenant-backups" ||
    page === "queue-management" ||
    page === "storage-manager" ||
    page === "access" ||
    page === "activity" ||
    page === "uiux" ||
    page === "design-system"
    ? page
    : "overview";
}

function SaOverview({ onOpenApp }: { onOpenApp: (appId: OrchestratedAppId) => void }) {
  const apps = useAppOperationsQuery();
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5 lg:w-[calc(100%-3rem)]">
      <section className="rounded-md border bg-card px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold uppercase text-muted-foreground">
          Repository Operations
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live state for the single Platform runtime and its composed workspace packages.
        </p>
      </section>
      {apps.error ? (
        <section className="rounded-md border border-destructive/40 bg-card p-4 text-sm text-destructive">
          {apps.error.message}
        </section>
      ) : null}
      <AppOperationsStrip apps={apps.data ?? []} onSelect={onOpenApp} />
    </main>
  );
}
