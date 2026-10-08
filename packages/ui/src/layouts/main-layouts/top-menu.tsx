import { useEffect, type ReactNode } from "react";
import { CommandIcon, MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "../../components/button";
import { TopMenuAppLauncher } from "./top-menu-app-launcher";
import { TopMenuNotifications, type TopMenuNotification } from "./top-menu-notifications";
import { TopMenuSearch, type TopMenuSearchItem } from "./top-menu-search";
import type { TopMenuAppItem, TopMenuUser } from "./top-menu-types";
import { TopMenuUserMenu } from "./top-menu-user";

export type TopMenuProps = {
  appItems: TopMenuAppItem[];
  applicationName: string;
  logoutHref?: string;
  notifications: TopMenuNotification[];
  onCloseSearch: () => void;
  onLogout?: () => void | Promise<void>;
  onNotificationDismiss?: (id: string) => void;
  onOpenSearch: () => void;
  onProfile?: () => void;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  profileHref?: string;
  search: string;
  searchDialogClassName?: string;
  searchItems: TopMenuSearchItem[];
  searchOpen: boolean;
  searchPlaceholder: string;
  searchLeadingAction?: ReactNode;
  user: TopMenuUser;
};

export function TopMenu({
  appItems,
  applicationName,
  logoutHref,
  notifications,
  onCloseSearch,
  onLogout,
  onNotificationDismiss,
  onOpenSearch,
  onProfile,
  onSearchChange,
  onToggleSidebar,
  profileHref,
  search,
  searchDialogClassName,
  searchItems,
  searchOpen,
  searchPlaceholder,
  searchLeadingAction,
  user
}: TopMenuProps) {
  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenSearch();
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [onOpenSearch]);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b">
        <div className="flex h-full min-w-0 items-center">
          <Button
            aria-label="Toggle application navigation"
            className="h-full w-12 rounded-none border-r"
            onClick={onToggleSidebar}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MenuIcon className="size-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-2 px-5 text-sm font-semibold">
            <CommandIcon className="size-4" />
            <span className="truncate">{applicationName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4">
          {searchLeadingAction}
          <Button
            className="h-8 gap-2 rounded-full shadow-sm"
            onClick={onOpenSearch}
            size="sm"
            type="button"
            variant="outline"
          >
            <SearchIcon className="size-4" /> <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded bg-muted px-1 text-[10px] text-muted-foreground sm:inline">
              Ctrl K
            </kbd>
          </Button>
          <TopMenuNotifications
            notifications={notifications}
            {...(onNotificationDismiss ? { onDismiss: onNotificationDismiss } : {})}
            user={user}
            workspaceTitle={applicationName}
          />
          <TopMenuAppLauncher items={appItems} />
          <TopMenuUserMenu
            {...(logoutHref ? { logoutHref } : {})}
            {...(onLogout ? { onLogout } : {})}
            {...(onProfile ? { onProfile } : {})}
            {...(profileHref ? { profileHref } : {})}
            user={user}
          />
        </div>
      </header>
      <TopMenuSearch
        {...(searchDialogClassName ? { contentClassName: searchDialogClassName } : {})}
        items={searchItems}
        onClose={onCloseSearch}
        onSearchChange={onSearchChange}
        open={searchOpen}
        placeholder={searchPlaceholder}
        search={search}
      />
    </>
  );
}
