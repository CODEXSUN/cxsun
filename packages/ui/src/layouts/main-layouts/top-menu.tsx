import { useEffect, useRef } from "react";
import { BellIcon, CommandIcon, MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/dropdown-menu";
import { TopMenuAppLauncher } from "./top-menu-app-launcher";
import type { TopMenuAppItem, TopMenuUser } from "./top-menu-types";
import { TopMenuUserMenu } from "./top-menu-user";

export type TopMenuProps = {
  appItems: TopMenuAppItem[];
  applicationName: string;
  logoutHref?: string;
  notificationCount: number;
  onCloseSearch: () => void;
  onLogout?: () => void | Promise<void>;
  onOpenSearch: () => void;
  onProfile?: () => void;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  profileHref?: string;
  search: string;
  searchOpen: boolean;
  searchPlaceholder: string;
  user: TopMenuUser;
};

export function TopMenu({
  appItems,
  applicationName,
  logoutHref,
  notificationCount,
  onCloseSearch,
  onLogout,
  onOpenSearch,
  onProfile,
  onSearchChange,
  onToggleSidebar,
  profileHref,
  search,
  searchOpen,
  searchPlaceholder,
  user
}: TopMenuProps) {
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b">
      <div className="flex h-full min-w-0 items-center">
        <Button
          aria-label="Toggle application navigation"
          className="h-full w-14 rounded-none border-r"
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
        {searchOpen ? (
          <input
            ref={searchInput}
            aria-label="Search workspace navigation"
            className="h-8 w-36 rounded-full border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCloseSearch();
            }}
            placeholder={searchPlaceholder}
            value={search}
          />
        ) : (
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
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Notifications" className="relative" size="icon" variant="ghost">
              <BellIcon className="size-4" />
              {notificationCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{notificationCount} unread notifications</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  );
}
