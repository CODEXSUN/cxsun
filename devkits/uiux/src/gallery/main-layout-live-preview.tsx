import { useState } from "react";
import { createPortal } from "react-dom";
import { LayoutDashboardIcon, PanelLeftIcon } from "lucide-react";
import { AppSidebar } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import type { SidemenuItem } from "@cxsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { SidebarInset, useSidebar } from "@cxsun/ui/components/sidebar";
import {
  TopologyInspectionControl,
  TopologyInspector,
  TopologyMarker,
  TopologyRegion,
  type InterfaceTopologyController
} from "@cxsun/ui/features/interface-topology";
import { AppHeader, AppLayout, StatusBar, TopMenu } from "@cxsun/ui/layouts/main-layouts";
import { galleryApps, galleryNotifications, galleryUser } from "./main-layout-fixtures";

export function MainLayoutLivePreview({
  appHref,
  brandHref,
  menuItems,
  pageTitle,
  topology
}: {
  appHref: string;
  brandHref: string;
  menuItems: SidemenuItem[];
  pageTitle: string;
  topology: InterfaceTopologyController;
}) {
  const { toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Ready");
  const [notifications, setNotifications] = useState(galleryNotifications);

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  return (
    <AppLayout className="relative h-svh w-full">
      <TopologyRegion as="div" className="shrink-0" id="S01" topology={topology}>
        <TopMenu
          appItems={galleryApps.map((item) => ({ ...item, url: appHref }))}
          applicationName="UIUX"
          notifications={notifications}
          onCloseSearch={closeSearch}
          onLogout={() => setStatus("Sign out preview")}
          onNotificationDismiss={(id) =>
            setNotifications((current) => current.filter((entry) => entry.id !== id))
          }
          onOpenSearch={() => setSearchOpen(true)}
          onProfile={() => setStatus("Profile preview")}
          onSearchChange={setSearch}
          onToggleSidebar={toggleSidebar}
          search={search}
          searchItems={[
            {
              label: "Go to Overview",
              description: "Show the workspace overview",
              icon: LayoutDashboardIcon,
              onSelect: () => setStatus("Ready")
            },
            {
              label: "Toggle sidebar",
              description: "Show or hide the application menu",
              icon: PanelLeftIcon,
              onSelect: toggleSidebar
            }
          ]}
          searchOpen={searchOpen}
          searchPlaceholder="Search navigation"
          user={galleryUser}
        />
      </TopologyRegion>
      <div className="relative flex min-h-0 flex-1">
        <AppSidebar
          {...topology.regionProps("S02")}
          brand={{ href: brandHref, subtitle: "Design workspace", title: "UIUX" }}
          className={`${topology.highlightClassName("S02")} md:p-1`}
          items={menuItems}
          positioning="container"
          user={{ email: "Shared UI gallery", fallback: "UI", name: "UIUX" }}
          userMenuItems={[]}
          versionLabel="Gallery"
          variant="inset"
        />
        <div className="absolute left-0 top-0 z-30">
          <TopologyMarker id="S02" topology={topology} />
        </div>
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden md:peer-data-[variant=inset]:m-1 md:peer-data-[variant=inset]:ml-0">
          <TopologyRegion as="div" className="shrink-0" id="S03" topology={topology}>
            <AppHeader breadcrumbs={[{ label: pageTitle }]} homeHref={appHref} name="UIUX" />
          </TopologyRegion>
          <TopologyRegion
            aria-label="Workspace canvas"
            as="div"
            className="min-h-0 flex-1 p-6 text-sm text-muted-foreground"
            id="S04"
            topology={topology}
          >
            {pageTitle} workspace canvas
          </TopologyRegion>
        </SidebarInset>
      </div>
      <TopologyRegion as="div" className="shrink-0" id="S05" topology={topology}>
        <StatusBar status={status} workspace={pageTitle} />
      </TopologyRegion>
      {createPortal(
        <>
          <TopologyInspectionControl topology={topology} />
          <TopologyInspector topology={topology} />
        </>,
        topologyOverlayHost()
      )}
    </AppLayout>
  );
}

function topologyOverlayHost(): HTMLElement {
  try {
    return window.parent.document.body;
  } catch {
    return document.body;
  }
}
