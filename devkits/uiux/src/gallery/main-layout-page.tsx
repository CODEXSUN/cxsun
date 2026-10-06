import { useState } from "react";
import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { galleryPageUrl } from "./gallery-routes";

const importPath = "@cxsun/ui/layouts/main-layouts";

function mainLayoutPreviewUrl() {
  return galleryPageUrl("main-layouts", "main-layout");
}

const usageCode = `import { AppSidebar } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import { SidebarInset, SidebarProvider } from "@cxsun/ui/components/sidebar";
import {
  TopologyInspectionControl, TopologyInspector, TopologyRegion,
  useInterfaceTopology
} from "@cxsun/ui/features/interface-topology";
import { AppHeader, AppLayout, StatusBar, TopMenu } from "@cxsun/ui/layouts/main-layouts";

export function MainLayoutView() {
  const topology = useInterfaceTopology(topologyDesks);

  return <SidebarProvider>
  <AppLayout className="relative h-screen w-full">
    <TopologyRegion id="S01" topology={topology}>
      <TopMenu {...topMenuProps} />
    </TopologyRegion>
    <div className="relative flex min-h-0 flex-1">
      <AppSidebar
        {...topology.regionProps("S02")}
        brand={brand}
        className={topology.highlightClassName("S02")}
        items={menuItems}
        positioning="container"
        user={sidebarUser}
        variant="inset"
      />
      <SidebarInset>
        <TopologyRegion id="S03" topology={topology}>
          <AppHeader breadcrumbs={[{ label: "Main Layout" }]} homeHref={overviewHref} name="UIUX" />
        </TopologyRegion>
        <TopologyRegion className="flex-1" id="S04" topology={topology}>
          {workspacePage}
        </TopologyRegion>
      </SidebarInset>
    </div>
    <TopologyRegion id="S05" topology={topology}>
      <StatusBar status="Ready" workspace={workspaceTitle} />
    </TopologyRegion>
    <TopologyInspectionControl topology={topology} />
    <TopologyInspector topology={topology} />
  </AppLayout>
</SidebarProvider>;
}`;

export function MainLayoutPage() {
  const [copied, setCopied] = useState<"path" | "code" | null>(null);

  async function copy(value: string, target: "path" | "code") {
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">Layout</span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
          <h1 className="font-semibold">Main Layout</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="max-w-[70vw] truncate rounded-md bg-muted px-3 py-2 text-xs">
            {importPath}
          </code>
          <Button
            aria-label="Copy import path"
            onClick={() => void copy(importPath, "path")}
            size="icon"
            type="button"
            variant="ghost"
          >
            {copied === "path" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Button>
        </div>
      </header>

      <section
        aria-label="Main Layout live preview"
        className="overflow-hidden rounded-md border bg-background shadow-sm"
      >
        <div className="flex h-9 items-center gap-1 border-b px-4">
          <span className="size-2 rounded-full bg-rose-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Main Layout
          </span>
        </div>
        <iframe
          className="h-[min(67vh,44rem)] min-h-[28rem] w-full"
          src={mainLayoutPreviewUrl()}
          title="Main Layout live preview"
        />
      </section>

      <section aria-labelledby="main-layout-code" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="main-layout-code" className="text-lg font-semibold">
            Usage code
          </h2>
          <Button
            onClick={() => void copy(usageCode, "code")}
            size="sm"
            type="button"
            variant="outline"
          >
            {copied === "code" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-6">
          <code>{usageCode}</code>
        </pre>
      </section>
    </div>
  );
}
