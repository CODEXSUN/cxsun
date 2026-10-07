import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpRightIcon,
  BlocksIcon,
  BoxIcon,
  ComponentIcon,
  LayoutTemplateIcon,
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
import { useInterfaceTopology } from "@cxsun/ui/features/interface-topology";
import { mainLayoutTopologyDesks } from "./gallery/interface-topology-fixtures";
import { MainLayoutPage } from "./gallery/main-layout-page";
import { MainLayoutLivePreview } from "./gallery/main-layout-live-preview";
import { LayoutPartPage, type LayoutPart } from "./gallery/layout-part-page";
import { galleryPageFromUrl, galleryPageUrl } from "./gallery/gallery-routes";
import {
  componentFromPage,
  componentPage,
  componentPages,
  type ComponentPage as ComponentPageRoute
} from "./gallery/component-pages";

const FoundationsGallery = lazy(() =>
  import("./gallery/foundations-gallery").then((m) => ({ default: m.FoundationsGallery }))
);
const WorkspaceGallery = lazy(() =>
  import("./gallery/workspace-gallery").then((m) => ({ default: m.WorkspaceGallery }))
);
const ComponentDetailPage = lazy(() =>
  import("./gallery/component-page").then((m) => ({ default: m.ComponentPage }))
);
const InterfaceTopologyGallery = lazy(() =>
  import("./gallery/interface-topology-gallery").then((m) => ({
    default: m.InterfaceTopologyGallery
  }))
);

type BaseGalleryPage =
  "main-layouts" | LayoutPart | "foundations" | "workspace" | "interface-topology";
type GalleryPage = BaseGalleryPage | ComponentPageRoute;

const pageTitles: Record<BaseGalleryPage, string> = {
  "main-layouts": "Main Layout",
  "app-layout": "App Layout",
  "top-menu": "Top Menu",
  "side-menu": "Side Menu",
  "app-header": "App Header",
  "status-bar": "Status Bar",
  foundations: "Foundations",
  workspace: "Workspace blocks",
  "interface-topology": "Interface topology"
};

function pageFromUrl(): GalleryPage {
  const requested = galleryPageFromUrl();
  if (requested === "components") return componentPage(componentPages[0].id);
  if (requested && componentFromPage(requested)) return requested as ComponentPageRoute;
  return requested && requested in pageTitles ? (requested as BaseGalleryPage) : "main-layouts";
}

function pageTitle(page: GalleryPage) {
  return componentFromPage(page)?.name ?? pageTitles[page as BaseGalleryPage];
}

export function UiuxGallery({
  componentCatalogHref,
  deskRoutesAvailable = false
}: {
  componentCatalogHref?: string;
  deskRoutesAvailable?: boolean;
}) {
  const [page, setPage] = useState<GalleryPage>(pageFromUrl);
  const selectedComponent = componentFromPage(page);
  const previewMode = new URLSearchParams(window.location.search).get("uiuxPreview");
  const topology = useInterfaceTopology(mainLayoutTopologyDesks);

  useEffect(() => {
    if (
      !deskRoutesAvailable &&
      (!window.location.pathname.startsWith("/uiux/") || galleryPageFromUrl() !== pageFromUrl())
    ) {
      window.history.replaceState(window.history.state, "", galleryPageUrl(pageFromUrl()));
    } else if (deskRoutesAvailable && galleryPageFromUrl() !== pageFromUrl()) {
      window.history.replaceState(window.history.state, "", galleryPageUrl(pageFromUrl()));
    }
    const syncPage = () => setPage(pageFromUrl());
    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, [deskRoutesAvailable]);

  function selectPage(nextPage: GalleryPage) {
    window.history.pushState({ uiux: nextPage }, "", galleryPageUrl(nextPage));
    setPage(nextPage);
  }

  const menuItems: SidemenuItem[] = [
    {
      title: "Layouts",
      icon: LayoutTemplateIcon,
      isActive: page === "main-layouts",
      items: [
        {
          title: "Main Layout",
          icon: PanelsTopLeftIcon,
          isActive: page === "main-layouts",
          onSelect: () => selectPage("main-layouts")
        }
      ]
    },
    {
      title: "Blocks",
      icon: BlocksIcon,
      isActive:
        page === "app-layout" ||
        page === "top-menu" ||
        page === "side-menu" ||
        page === "app-header" ||
        page === "status-bar",
      items: [
        {
          title: "App Layout",
          icon: PanelsTopLeftIcon,
          ...(page === "app-layout" ? { isActive: true } : {}),
          onSelect: () => selectPage("app-layout"),
          items: [
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
              title: "App Header",
              icon: PanelsTopLeftIcon,
              isActive: page === "app-header",
              onSelect: () => selectPage("app-header")
            },
            {
              title: "Status Bar",
              icon: PanelBottomIcon,
              isActive: page === "status-bar",
              onSelect: () => selectPage("status-bar")
            }
          ]
        }
      ]
    },
    {
      title: "Components",
      icon: ComponentIcon,
      isActive: page.startsWith("components/"),
      items: componentPages.map((component) => ({
        title: component.name,
        icon: BoxIcon,
        isActive: page === componentPage(component.id),
        onSelect: () => selectPage(componentPage(component.id))
      }))
    },
    {
      title: "Design library",
      icon: PaletteIcon,
      isActive: page === "foundations" || page === "workspace" || page === "interface-topology",
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
          title: "Interface topology",
          icon: PanelsTopLeftIcon,
          isActive: page === "interface-topology",
          onSelect: () => selectPage("interface-topology")
        }
      ]
    }
  ];

  if (previewMode === "main-layout") {
    return (
      <SidebarProvider style={{ "--sidebar-width": "17rem" } as CSSProperties}>
        <MainLayoutLivePreview
          appHref={galleryPageUrl("main-layouts")}
          brandHref={galleryPageUrl("main-layouts")}
          menuItems={menuItems}
          pageTitle={pageTitle(page)}
          topology={topology}
        />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem" } as CSSProperties}>
      <AppSidebar
        brand={{
          href: galleryPageUrl("main-layouts"),
          subtitle: "Design workspace",
          title: "UIUX"
        }}
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
            <span className="truncate text-sm text-muted-foreground">{pageTitle(page)}</span>
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
          {previewMode === "side-menu" ? (
            <div className="text-sm text-muted-foreground">{pageTitle(page)} workspace canvas</div>
          ) : (
            <Suspense
              fallback={<p className="py-8 text-sm text-muted-foreground">Loading page…</p>}
            >
              {page === "main-layouts" ? <MainLayoutPage /> : null}
              {page === "app-layout" ||
              page === "top-menu" ||
              page === "side-menu" ||
              page === "app-header" ||
              page === "status-bar" ? (
                <LayoutPartPage part={page} />
              ) : null}
              {page === "foundations" ? <FoundationsGallery /> : null}
              {page === "workspace" ? <WorkspaceGallery /> : null}
              {selectedComponent ? (
                <ComponentDetailPage
                  componentId={selectedComponent.id}
                  onNavigate={selectPage}
                  {...(componentCatalogHref ? { componentCatalogHref } : {})}
                />
              ) : null}
              {page === "interface-topology" ? <InterfaceTopologyGallery /> : null}
            </Suspense>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
