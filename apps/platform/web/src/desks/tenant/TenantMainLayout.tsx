import { useState, type CSSProperties, type ReactNode } from "react";
import { SearchIcon, Settings2Icon, type LucideIcon } from "lucide-react";
import { AppSidebar, type SidebarBrand } from "@cxsun/ui/blocks/menu/sidemenu/app-sidebar";
import type {
  SidemenuItem,
  SidemenuSubItem
} from "@cxsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import {
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar
} from "@cxsun/ui/components/sidebar";
import {
  AppHeader,
  AppLayout,
  StatusBar,
  TopMenu,
  type TopMenuAppItem,
  type TopMenuSearchItem,
  type TopMenuUser
} from "@cxsun/ui/layouts/main-layouts";

type TenantMainLayoutProps = {
  appItems: TopMenuAppItem[];
  brand: SidebarBrand;
  children: ReactNode;
  headerTitle: string;
  homeHref: string;
  menuItems: SidemenuItem[];
  onLogout: () => Promise<void>;
  onOpenSettings: () => void;
  settingsActive: boolean;
  sidebarPrimaryAction?: { icon: LucideIcon; label: string; onSelect: () => void };
  user: TopMenuUser;
  versionLabel: string;
  workspaceName: string;
  zetroDrawer?: ReactNode;
};

export function TenantMainLayout(props: TenantMainLayoutProps) {
  return (
    <SidebarProvider
      className="h-dvh min-h-0"
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
    >
      <TenantMainShell {...props} />
    </SidebarProvider>
  );
}

function TenantMainShell({
  appItems,
  brand,
  children,
  headerTitle,
  homeHref,
  menuItems,
  onLogout,
  onOpenSettings,
  settingsActive,
  sidebarPrimaryAction,
  user,
  versionLabel,
  workspaceName,
  zetroDrawer
}: TenantMainLayoutProps) {
  const { toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchItems: TopMenuSearchItem[] = [
    ...appItems.map((app) => ({
      description: app.description,
      icon: app.icon,
      label: `Go to ${app.title}`,
      onSelect: app.onSelect ?? (() => window.location.assign(app.url ?? homeHref))
    })),
    ...menuSearchItems(menuItems),
    {
      description: "Show or hide workspace navigation",
      label: "Toggle sidebar",
      onSelect: toggleSidebar
    }
  ];

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  return (
    <AppLayout className="relative h-dvh w-full">
      <div className="shrink-0 [&>header]:h-[50px] [&>header>div:last-child]:gap-3">
        <TopMenu
          appItems={appItems}
          applicationName={workspaceName}
          notifications={[]}
          onCloseSearch={closeSearch}
          onLogout={onLogout}
          onOpenSearch={() => setSearchOpen(true)}
          onSearchChange={setSearch}
          onToggleSidebar={toggleSidebar}
          profileHref="/app/application/profile"
          search={search}
          searchDialogClassName="top-[40%]"
          searchItems={searchItems}
          searchOpen={searchOpen}
          searchPlaceholder="Search applications and commands"
          searchLeadingAction={zetroDrawer}
          user={user}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 pt-0.5">
        <AppSidebar
          brand={brand}
          className="md:p-1 md:pt-0.5 md:pb-0.5"
          footerContent={
            <>
              <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                {versionLabel}
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={settingsActive} tooltip="Settings">
                    <button onClick={onOpenSettings} type="button">
                      <Settings2Icon />
                      <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          }
          items={menuItems}
          positioning="container"
          {...(sidebarPrimaryAction ? { primaryAction: sidebarPrimaryAction } : {})}
          user={user}
          variant="inset"
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden md:peer-data-[variant=inset]:m-1 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:mb-0.5">
          <AppHeader
            breadcrumbs={[{ label: workspaceName, href: homeHref }, { label: headerTitle }]}
            homeHref={homeHref}
          />
          <div
            aria-label="Workspace canvas"
            className="workspace-scroll min-h-0 flex-1 overflow-y-auto"
          >
            {children}
          </div>
        </SidebarInset>
      </div>
      <StatusBar status="Connected" workspace={headerTitle} />
    </AppLayout>
  );
}

function menuSearchItems(items: Array<SidemenuItem | SidemenuSubItem>): TopMenuSearchItem[] {
  return items.flatMap((item) => {
    const url = item.url;
    const action = item.onSelect ?? (url ? () => window.location.assign(url) : null);
    const current: TopMenuSearchItem[] = action
      ? [{ icon: item.icon ?? SearchIcon, label: `Go to ${item.title}`, onSelect: action }]
      : [];
    return [...current, ...menuSearchItems(item.items ?? [])];
  });
}
