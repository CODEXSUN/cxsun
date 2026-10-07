import { useEffect, useState } from "react";
import { ArrowRightIcon, Grid2X2Icon } from "lucide-react";
import {
  MainLayout,
  type MainLayoutNavigationSection,
  type TopMenuAppItem
} from "@cxsun/ui/layouts/main-layouts";
import { enabledCodexsunApps, type CodexsunAppEntry } from "./apps";
import { platformWebUrl } from "./platform-web";
import { endTenantSession, loadTenantSession, type TenantSession } from "./session";

type SessionState =
  | { kind: "loading" }
  | { kind: "ready"; session: TenantSession }
  | { kind: "unavailable"; message: string };

function selectedAppId(): string | null {
  const match = /^\/apps\/([a-z-]+)\/?$/u.exec(window.location.pathname);
  return match?.[1] ?? null;
}

function appPath(app: CodexsunAppEntry): string {
  return `/apps/${app.id}`;
}

function AppCard({ app }: { app: CodexsunAppEntry }) {
  const Icon = app.icon;
  return (
    <a
      className="group flex min-h-32 flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
      href={appPath(app)}
    >
      <div className="flex items-start justify-between">
        <Icon aria-hidden="true" className="size-5 text-primary" />
        <ArrowRightIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground group-hover:text-foreground"
        />
      </div>
      <div>
        <h2 className="font-medium">{app.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
      </div>
    </a>
  );
}

function AppContent({
  app,
  apps
}: {
  app: CodexsunAppEntry | undefined;
  apps: CodexsunAppEntry[];
}) {
  if (!app) {
    return (
      <div className="mx-auto h-full max-w-6xl space-y-6 overflow-y-auto p-6 lg:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Codexsun
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Your applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an enabled application to open its workspace.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((item) => (
            <AppCard app={item} key={item.id} />
          ))}
        </div>
      </div>
    );
  }

  const Icon = app.icon;
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto p-6 lg:p-8">
      <div className="rounded-lg border bg-card p-6">
        <Icon aria-hidden="true" className="size-6 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">{app.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{app.description}</p>
        <a
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          href={platformWebUrl(app.path)}
        >
          Open {app.title} <ArrowRightIcon aria-hidden="true" className="size-4" />
        </a>
      </div>
    </div>
  );
}

function SessionNotice({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Codexsun</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex gap-3">
          <a
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            href={platformWebUrl("/login")}
          >
            Sign in
          </a>
          <button
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}

export function CodexsunApp() {
  const [state, setState] = useState<SessionState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    void loadTenantSession()
      .then((session) => {
        if (!active) return;
        setState(
          session.authenticated && session.userType === "tenant"
            ? { kind: "ready", session }
            : { kind: "unavailable", message: "Sign in with your tenant account to open Codexsun." }
        );
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            kind: "unavailable",
            message: error instanceof Error ? error.message : "The Platform API is unavailable."
          });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading Codexsun…
      </main>
    );
  }
  if (state.kind === "unavailable") return <SessionNotice message={state.message} />;

  const apps = enabledCodexsunApps(state.session.context?.enabledModuleKeys ?? []);
  const app = apps.find((item) => item.id === selectedAppId());
  const appItems: TopMenuAppItem[] = apps.map((item) => ({
    active: item.id === app?.id,
    description: item.description,
    icon: item.icon,
    title: item.title,
    url: appPath(item)
  }));
  const navigation: MainLayoutNavigationSection[] = [
    {
      icon: Grid2X2Icon,
      items: apps.map((item) => ({
        icon: item.icon,
        label: item.title,
        onSelect: () => window.location.assign(appPath(item))
      })),
      label: "Applications"
    }
  ];
  const name = state.session.name || state.session.email;

  return (
    <MainLayout
      className="h-dvh w-full"
      appItems={appItems}
      applicationName="Codexsun"
      homeHref="/"
      navigation={navigation}
      onLogout={async () => {
        await endTenantSession();
        window.location.assign(platformWebUrl("/login"));
      }}
      statusLabel="Connected"
      user={{ email: state.session.email, fallback: name.slice(0, 2).toUpperCase(), name }}
      workspaceTitle={app?.title ?? "Overview"}
    >
      <AppContent app={app} apps={apps} />
    </MainLayout>
  );
}
