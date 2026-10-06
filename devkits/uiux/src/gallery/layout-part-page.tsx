import { useState, type ReactNode } from "react";
import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import {
  AppHeaderPreview,
  AppLayoutPreview,
  StatusBarPreview,
  TopMenuPreview
} from "./layout-part-previews";
import { galleryPageUrl } from "./gallery-routes";

export type LayoutPart = "app-layout" | "top-menu" | "side-menu" | "app-header" | "status-bar";

const importPath = "@cxsun/ui/layouts/main-layouts";
const sidebarImportPath = "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";

function sideMenuPreviewUrl() {
  return galleryPageUrl("side-menu", "side-menu");
}

const parts: Record<
  LayoutPart,
  { component: string; title: string; description: string; code: string }
> = {
  "app-layout": {
    component: "AppLayout",
    title: "App Layout",
    description: "The base surface that holds the authenticated application shell.",
    code: `import { AppSidebar } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import { SidebarInset, SidebarProvider } from "@cxsun/ui/components/sidebar";
import { AppHeader, AppLayout, StatusBar, TopMenu } from "@cxsun/ui/layouts/main-layouts";

<SidebarProvider>
  <AppLayout className="h-screen w-full">
    <TopMenu {...topMenuProps} />
    <div className="relative flex min-h-0 flex-1">
      <AppSidebar {...sideMenuProps} positioning="container" />
      <SidebarInset>
        <AppHeader breadcrumbs={[{ label: selected }]} homeHref={overviewHref} name="UIUX" />
        {page}
      </SidebarInset>
    </div>
    <StatusBar status="Ready" workspace={selected} />
  </AppLayout>
</SidebarProvider>`
  },
  "top-menu": {
    component: "TopMenu",
    title: "Top Menu",
    description:
      "Application identity, navigation toggle, search, notifications, and account actions.",
    code: `import { TopMenu } from "@cxsun/ui/layouts/main-layouts";

<TopMenu
  appItems={apps}
  applicationName="UI"
  notifications={notifications}
  onCloseSearch={() => setSearchOpen(false)}
  onLogout={handleLogout}
  onNotificationDismiss={dismissNotification}
  onOpenSearch={() => setSearchOpen(true)}
  onProfile={openProfile}
  onSearchChange={setSearch}
  onToggleSidebar={() => setSidebarOpen((open) => !open)}
  search={search}
  searchItems={commands}
  searchOpen={searchOpen}
  searchPlaceholder="Search navigation"
  user={signedInUser}
/>`
  },
  "side-menu": {
    component: "AppSidebar",
    title: "Side Menu",
    description: "The working gallery sidebar and workspace, rendered live below.",
    code: `import { AppSidebar } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import { SidebarInset, SidebarProvider } from "@cxsun/ui/components/sidebar";

<SidebarProvider>
  <AppSidebar brand={brand} items={menuItems} user={user} variant="inset" />
  <SidebarInset>
    <header>{workspaceHeader}</header>
    <main>{workspacePage}</main>
  </SidebarInset>
</SidebarProvider>`
  },
  "app-header": {
    component: "AppHeader",
    title: "App Header",
    description: "Workspace heading with a clickable Home icon, breadcrumb, and name.",
    code: `import { AppHeader } from "@cxsun/ui/layouts/main-layouts";

<AppHeader
  breadcrumbs={[{ label: "Main Layout" }]}
  homeHref={overviewHref}
  name="UIUX"
/>`
  },
  "status-bar": {
    component: "StatusBar",
    title: "Status Bar",
    description: "A compact footer showing the current state and workspace.",
    code: `import { StatusBar } from "@cxsun/ui/layouts/main-layouts";

<StatusBar status="Ready" workspace="Overview" />`
  }
};

const previews: Record<LayoutPart, ReactNode> = {
  "app-layout": <AppLayoutPreview />,
  "top-menu": <TopMenuPreview />,
  "side-menu": null,
  "app-header": <AppHeaderPreview />,
  "status-bar": <StatusBarPreview />
};

export function LayoutPartPage({ part }: { part: LayoutPart }) {
  const [copied, setCopied] = useState<"path" | "code" | null>(null);
  const entry = parts[part];
  const entryImportPath = part === "side-menu" ? sidebarImportPath : importPath;

  async function copy(value: string, target: "path" | "code") {
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">Blocks</span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
          {part !== "app-layout" ? (
            <>
              <span className="text-muted-foreground">App Layout</span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </>
          ) : null}
          <h1 className="font-semibold">{entry.title}</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="max-w-[70vw] truncate rounded-md bg-muted px-3 py-2 text-xs">
            {entryImportPath}
          </code>
          <Button
            aria-label="Copy import path"
            onClick={() => void copy(entryImportPath, "path")}
            size="icon"
            type="button"
            variant="ghost"
          >
            {copied === "path" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Button>
        </div>
      </header>

      <section className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live preview</h2>
          <p className="text-sm text-muted-foreground">
            {entry.description}
            {part === "side-menu"
              ? null
              : ` This preview imports the shared ${entry.component} component.`}
          </p>
        </div>
        {part === "side-menu" ? (
          <iframe
            className="h-[min(65vh,36rem)] min-h-96 w-full rounded-md border bg-background shadow-sm"
            src={sideMenuPreviewUrl()}
            title="Side Menu live preview"
          />
        ) : (
          <div
            aria-label={`${entry.title} live preview`}
            className="overflow-hidden rounded-md border bg-background shadow-sm"
          >
            <div className="flex h-9 items-center gap-1 border-b px-4">
              <span className="size-2 rounded-full bg-rose-400" />
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="size-2 rounded-full bg-emerald-400" />
              <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {entry.component}
              </span>
            </div>
            {previews[part]}
          </div>
        )}
      </section>

      <section aria-labelledby="layout-part-code" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="layout-part-code" className="text-lg font-semibold">
            Usage code
          </h2>
          <Button
            onClick={() => void copy(entry.code, "code")}
            size="sm"
            type="button"
            variant="outline"
          >
            {copied === "code" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-6">
          <code>{entry.code}</code>
        </pre>
      </section>
    </div>
  );
}
