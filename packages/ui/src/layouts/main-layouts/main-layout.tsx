import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "./app-layout";
import { SideMenu } from "./side-menu";
import { StatusBar } from "./status-bar";
import { TopMenu } from "./top-menu";
import type { TopMenuAppItem, TopMenuUser } from "./top-menu-types";
import type { MainLayoutNavigationSection } from "./types";
import { WorkspaceCanvas } from "./workspace-canvas";

export type MainLayoutProps = {
  appItems: TopMenuAppItem[];
  applicationName: string;
  children?: ReactNode;
  className?: string;
  navigation: MainLayoutNavigationSection[];
  notificationCount?: number;
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
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
  navigation,
  notificationCount = 0,
  logoutHref,
  onLogout,
  onProfile,
  profileHref,
  searchPlaceholder = "Search",
  statusLabel = "Ready",
  workspaceTitle = "Overview",
  user
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(workspaceTitle);

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  return (
    <AppLayout className={className}>
      <TopMenu
        appItems={appItems}
        applicationName={applicationName}
        {...(logoutHref ? { logoutHref } : {})}
        notificationCount={notificationCount}
        onCloseSearch={closeSearch}
        {...(onLogout ? { onLogout } : {})}
        onOpenSearch={() => setSearchOpen(true)}
        {...(onProfile ? { onProfile } : {})}
        onSearchChange={setSearch}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        {...(profileHref ? { profileHref } : {})}
        search={search}
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
        <WorkspaceCanvas>{children}</WorkspaceCanvas>
      </div>
      <StatusBar status={statusLabel} workspace={selected} />
    </AppLayout>
  );
}
