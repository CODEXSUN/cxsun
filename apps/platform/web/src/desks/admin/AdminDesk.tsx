import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Building2Icon, ClipboardCheckIcon, LifeBuoyIcon, PanelsTopLeftIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, Button, Card, GlobalLoader, StatusBadge } from "@cxsun/ui";
import { AuthGate } from "../../shared/auth/AuthGate";
import { apiGet, logout } from "../../shared/api/platform-api";
import type { PlatformAppDefinition } from "../../app/app-registry";

type AdminPage = "dashboard" | "app-registry" | "tenant-support" | "activation";

function pageFromUrl(pathname: string): AdminPage {
  const page = pathname.split("/")[2];
  return page === "app-registry" || page === "tenant-support" || page === "activation"
    ? page
    : "dashboard";
}

export function AdminDesk() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageFromUrl(location.pathname);

  useEffect(() => {
    const canonicalPath = page === "dashboard" ? "/admin" : `/admin/${page}`;
    if (location.pathname !== canonicalPath) void navigate({ to: canonicalPath, replace: true });
  }, [location.pathname, navigate, page]);

  function selectPage(nextPage: AdminPage) {
    const path = nextPage === "dashboard" ? "/admin" : `/admin/${nextPage}`;
    void navigate({ to: path });
  }

  async function handleLogout() {
    await logout("admin");
    window.location.assign("/admin/login");
  }

  return (
    <AuthGate desk="admin">
      <AdminLayout
        homeHref="/"
        onLogout={handleLogout}
        versionLabel={`v ${__APP_VERSION__}`}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant={page === "dashboard" ? "default" : "ghost"}
              onClick={() => selectPage("dashboard")}
            >
              Dashboard
            </Button>
            <Button
              size="sm"
              variant={page === "app-registry" ? "default" : "ghost"}
              onClick={() => selectPage("app-registry")}
            >
              Apps
            </Button>
            <Button
              size="sm"
              variant={page === "tenant-support" ? "default" : "ghost"}
              onClick={() => selectPage("tenant-support")}
            >
              Tenant Support
            </Button>
            <Button
              size="sm"
              variant={page === "activation" ? "default" : "ghost"}
              onClick={() => selectPage("activation")}
            >
              Activation
            </Button>
            <Button size="sm" variant="secondary" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        }
      >
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5 lg:w-[calc(100%-3rem)]">
          {page === "dashboard" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <AdminCard
                title="Tenant Support"
                icon={Building2Icon}
                text="Review tenant status and route setup requests."
              />
              <AdminCard
                title="App Registry"
                icon={PanelsTopLeftIcon}
                text="Review platform applications and stack boundaries."
              />
              <AdminCard
                title="Activation Review"
                icon={ClipboardCheckIcon}
                text="Approve feature and module activation changes."
              />
              <AdminCard
                title="Helpdesk"
                icon={LifeBuoyIcon}
                text="Track support operations from the staff desk."
              />
            </div>
          ) : null}
          {page === "app-registry" ? <AppRegistryPanel /> : null}
          {page === "tenant-support" ? (
            <Card title="Tenant Support" description="Operational tenant assistance.">
              <StatusBadge tone="green">Ready</StatusBadge>
            </Card>
          ) : null}
          {page === "activation" ? (
            <Card title="Activation Review" description="Module activation review.">
              <StatusBadge tone="green">Ready</StatusBadge>
            </Card>
          ) : null}
        </main>
      </AdminLayout>
    </AuthGate>
  );
}

function AppRegistryPanel() {
  const appsQuery = useQuery({
    queryFn: () => apiGet<PlatformAppDefinition[]>("/admin/apps", "admin"),
    queryKey: ["admin", "apps"]
  });

  if (appsQuery.isLoading) {
    return <GlobalLoader className="min-h-[24rem]" fullScreen={false} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(appsQuery.data ?? []).map((app) => (
        <Card key={app.id} title={app.label} description={app.description}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={app.alwaysEnabled ? "green" : "blue"}>
              {app.alwaysEnabled ? "Always enabled" : "Switchable"}
            </StatusBadge>
            <StatusBadge tone="neutral">{app.stack}</StatusBadge>
            <span className="font-mono text-xs text-muted-foreground">{app.moduleKey}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminCard({
  icon: Icon,
  text,
  title
}: {
  icon: typeof Building2Icon;
  text: string;
  title: string;
}) {
  return (
    <Card title={title} description={text}>
      <Icon className="size-5 text-muted-foreground" />
    </Card>
  );
}
