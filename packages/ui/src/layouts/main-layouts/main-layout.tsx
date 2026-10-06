import { useState, type ReactNode } from "react";
import { LayoutDashboardIcon, PanelLeftIcon, PanelsTopLeftIcon, Settings2Icon } from "lucide-react";
import { AppLayout } from "./app-layout";
import { AppHeader } from "./app-header";
import { SideMenu } from "./side-menu";
import { StatusBar } from "./status-bar";
import { TopMenu } from "./top-menu";
import type { TopMenuNotification } from "./top-menu-notifications";
import type { TopMenuSearchItem } from "./top-menu-search";
import type { TopMenuAppItem, TopMenuUser } from "./top-menu-types";
import type { MainLayoutNavigationSection } from "./types";
import { WorkspaceCanvas } from "./workspace-canvas";

export type MainLayoutProps = {
  appItems: TopMenuAppItem[];
  applicationName: string;
  children?: ReactNode;
  className?: string;
  homeHref?: string;
  navigation: MainLayoutNavigationSection[];
  notifications?: TopMenuNotification[];
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
  onNotificationDismiss?: (id: string) => void;
  onProfile?: () => void;
  profileHref?: string;
  searchPlaceholder?: string;
  statusLabel?: string;
  workspaceTitle?: string;
  user: TopMenuUser;
};

export function MainLayout({
  appItems,
  applicationName,
  children,
  className = "",
  homeHref,
  navigation,
  notifications = [],
  logoutHref,
  onLogout,
  onNotificationDismiss,
  onProfile,
  profileHref,
  searchPlaceholder = "Search workspaces or commands...",
  statusLabel = "Ready",
  workspaceTitle = "Overview",
  user
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(workspaceTitle);

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  const searchItems: TopMenuSearchItem[] = [
    {
      label: `Go to ${workspaceTitle}`,
      description: "Open workspace overview",
      icon: LayoutDashboardIcon,
      onSelect: () => setSelected(workspaceTitle)
    },
    ...navigation.flatMap((section) =>
      section.items.map((item) => ({
        label: `Go to ${item.label}`,
        description: `Open ${section.label}`,
        icon: item.icon ?? section.icon ?? PanelsTopLeftIcon,
        onSelect: () => {
          setSelected(item.label);
          item.onSelect?.();
        }
      }))
    ),
    {
      label: "Open settings",
      description: "Open workspace settings",
      icon: Settings2Icon,
      onSelect: () => setSelected("Settings")
    },
    {
      label: "Toggle sidebar",
      description: sidebarOpen ? "Hide workspace navigation" : "Show workspace navigation",
      icon: PanelLeftIcon,
      onSelect: () => setSidebarOpen((open) => !open)
    }
  ];

  return (
    <AppLayout className={className}>
      <TopMenu
        appItems={appItems}
        applicationName={applicationName}
        {...(logoutHref ? { logoutHref } : {})}
        notifications={notifications}
        onCloseSearch={closeSearch}
        {...(onLogout ? { onLogout } : {})}
        {...(onNotificationDismiss ? { onNotificationDismiss } : {})}
        onOpenSearch={() => setSearchOpen(true)}
        {...(onProfile ? { onProfile } : {})}
        onSearchChange={setSearch}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        {...(profileHref ? { profileHref } : {})}
        search={search}
        searchItems={searchItems}
        searchOpen={searchOpen}
        searchPlaceholder={searchPlaceholder}
        user={user}
      />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen ? (
          <SideMenu
            navigation={navigation}
            onSelect={setSelected}
            search={search}
            selected={selected}
            workspaceTitle={workspaceTitle}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            breadcrumbs={[{ label: selected }]}
            homeHref={homeHref ?? appItems.find((item) => item.active)?.url ?? "/"}
            name={user.name}
          />
          <WorkspaceCanvas>{children}</WorkspaceCanvas>
        </div>
      </div>
      <StatusBar status={statusLabel} workspace={selected} />
    </AppLayout>
  );
}
