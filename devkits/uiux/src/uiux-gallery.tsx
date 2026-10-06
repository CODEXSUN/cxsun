import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpRightIcon,
  BlocksIcon,
  ComponentIcon,
  LayoutTemplateIcon,
  MenuIcon,
  PaletteIcon,
  PanelsTopLeftIcon,
  SwatchBookIcon,
  PanelTopIcon,
  PanelLeftIcon,
  PanelBottomIcon
} from "lucide-react";
import { AppSidebar } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import type { SidemenuItem } from "@cxsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { Button } from "@cxsun/ui/components/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@cxsun/ui/components/sidebar";
import { MainLayoutPage } from "./gallery/main-layout-page";
import { LayoutPartPage, type LayoutPart } from "./gallery/layout-part-page";

const FoundationsGallery = lazy(() =>
  import("./gallery/foundations-gallery").then((m) => ({ default: m.FoundationsGallery }))
);
const LayoutsGallery = lazy(() =>
  import("./gallery/layouts-gallery").then((m) => ({ default: m.LayoutsGallery }))
);
const WorkspaceGallery = lazy(() =>
  import("./gallery/workspace-gallery").then((m) => ({ default: m.WorkspaceGallery }))
);
const ComponentsGallery = lazy(() =>
  import("./gallery/components-gallery").then((m) => ({ default: m.ComponentsGallery }))
);

type GalleryPage =
  "main-layouts" | "layouts" | LayoutPart | "foundations" | "workspace" | "components";
const pageTitles: Record<GalleryPage, string> = {
  "main-layouts": "Main Layout",
  layouts: "Layout inventory",
  "app-layout": "App Layout",
  "top-menu": "Top Menu",
  "side-menu": "Side Menu",
  "status-bar": "Status Bar",
  foundations: "Foundations",
  workspace: "Workspace blocks",
  components: "Components"
};

function pageFromUrl(): GalleryPage {
  const requested = new URLSearchParams(window.location.search).get("uiux");
  return requested && requested in pageTitles ? (requested as GalleryPage) : "main-layouts";
}

function pageUrl(page: GalleryPage) {
  const url = new URL(window.location.href);
  url.searchParams.set("uiux", page);
  return `${url.pathname}${url.search}`;
}

export function UiuxGallery({
  componentCatalogHref,
  deskRoutesAvailable = false
}: {
  componentCatalogHref?: string;
  deskRoutesAvailable?: boolean;
}) {
  const [page, setPage] = useState<GalleryPage>(pageFromUrl);

  useEffect(() => {
    const syncPage = () => setPage(pageFromUrl());
    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, []);

  function selectPage(nextPage: GalleryPage) {
    window.history.pushState({ uiux: nextPage }, "", pageUrl(nextPage));
    setPage(nextPage);
  }

  const menuItems: SidemenuItem[] = [
    {
      title: "Layouts",
      icon: LayoutTemplateIcon,
      isActive: page === "main-layouts" || page === "layouts",
      items: [
        {
          title: "Main Layout",
          icon: PanelsTopLeftIcon,
          isActive: page === "main-layouts",
          onSelect: () => selectPage("main-layouts")
        },
        {
          title: "Layout inventory",
          isActive: page === "layouts",
          onSelect: () => selectPage("layouts")
        }
      ]
    },
    {
      title: "Main Layout parts",
      icon: MenuIcon,
      isActive:
        page === "app-layout" ||
        page === "top-menu" ||
        page === "side-menu" ||
        page === "status-bar",
      items: [
        {
          title: "App Layout",
          icon: PanelsTopLeftIcon,
          isActive: page === "app-layout",
          onSelect: () => selectPage("app-layout")
        },
        {
          title: "Top Menu",
          icon: PanelTopIcon,
          isActive: page === "top-menu",
          onSelect: () => selectPage("top-menu")
        },
        {
          title: "Side Menu",
          icon: PanelLeftIcon,
          isActive: page === "side-menu",
          onSelect: () => selectPage("side-menu")
        },
        {
          title: "Status Bar",
          icon: PanelBottomIcon,
          isActive: page === "status-bar",
          onSelect: () => selectPage("status-bar")
        }
      ]
    },
    {
      title: "Design library",
      icon: PaletteIcon,
      isActive: page === "foundations" || page === "workspace" || page === "components",
      items: [
        {
          title: "Foundations",
          icon: SwatchBookIcon,
          isActive: page === "foundations",
          onSelect: () => selectPage("foundations")
        },
        {
          title: "Workspace blocks",
          icon: BlocksIcon,
          isActive: page === "workspace",
          onSelect: () => selectPage("workspace")
        },
        {
          title: "Components",
          icon: ComponentIcon,
          isActive: page === "components",
          onSelect: () => selectPage("components")
        }
      ]
    }
  ];

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem" } as CSSProperties}>
      <AppSidebar
        brand={{ href: pageUrl("main-layouts"), subtitle: "Design workspace", title: "UIUX" }}
        items={menuItems}
        user={{ email: "Shared UI gallery", fallback: "UI", name: "UIUX" }}
        userMenuItems={[]}
        versionLabel="Gallery"
        variant="inset"
      />
      <SidebarInset>
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger aria-label="Toggle gallery sidebar" />
            <span className="text-sm font-semibold">UIUX</span>
            <span aria-hidden="true" className="text-muted-foreground">
              /
            </span>
            <span className="truncate text-sm text-muted-foreground">{pageTitles[page]}</span>
          </div>
          {deskRoutesAvailable ? (
            <nav aria-label="Gallery top menu">
              <Button asChild size="sm" variant="ghost">
                <a href="/sa">
                  Desk <ArrowUpRightIcon className="size-4" />
                </a>
              </Button>
            </nav>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 text-foreground sm:px-6 lg:px-8">
          <Suspense fallback={<p className="py-8 text-sm text-muted-foreground">Loading page…</p>}>
            {page === "main-layouts" ? <MainLayoutPage /> : null}
            {page === "app-layout" ||
            page === "top-menu" ||
            page === "side-menu" ||
            page === "status-bar" ? (
              <LayoutPartPage part={page} />
            ) : null}
            {page === "layouts" ? (
              <LayoutsGallery deskRoutesAvailable={deskRoutesAvailable} />
            ) : null}
            {page === "foundations" ? <FoundationsGallery /> : null}
            {page === "workspace" ? <WorkspaceGallery /> : null}
            {page === "components" ? (
              <ComponentsGallery {...(componentCatalogHref ? { componentCatalogHref } : {})} />
            ) : null}
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
