import { useState } from "react";
import { LogOutIcon, UserRoundIcon, XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/avatar";
import { Button } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../components/dropdown-menu";
import type { TopMenuUser } from "./top-menu-types";

export type TopMenuUserMenuProps = {
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
  onProfile?: () => void;
  profileHref?: string;
  user: TopMenuUser;
};

export function TopMenuUserMenu({
  logoutHref,
  onLogout,
  onProfile,
  profileHref,
  user
}: TopMenuUserMenuProps) {
  const [open, setOpen] = useState(false);
  const greetingName = user.name.trim().split(/\s+/u)[0] || user.name;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`User menu for ${user.name}`}
          className="size-9 rounded-full p-0 ring-2 ring-primary/20 ring-offset-1 ring-offset-background"
          size="icon"
          variant="ghost"
        >
          <UserAvatar user={user} className="size-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-[1.75rem] border bg-popover p-3 text-popover-foreground shadow-2xl"
        sideOffset={10}
      >
        <DropdownMenuLabel className="relative px-3 pb-4 pt-1 text-center font-normal">
          <div className="truncate px-8 text-xs font-medium text-muted-foreground">
            {user.email}
          </div>
          <button
            aria-label="Close user menu"
            className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => setOpen(false)}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
          <div className="mt-4 flex flex-col items-center">
            <UserAvatar
              user={user}
              className="size-20 border-4 border-background shadow-md ring-2 ring-primary/20"
            />
            <div className="mt-3 text-xl font-medium tracking-tight">Hi, {greetingName}!</div>
            {profileHref ? (
              <Button asChild className="mt-3 rounded-full px-5" size="sm" variant="outline">
                <a href={profileHref}>
                  <UserRoundIcon />
                  Manage your profile
                </a>
              </Button>
            ) : (
              <Button
                className="mt-3 rounded-full px-5"
                disabled={!onProfile}
                onClick={() => {
                  setOpen(false);
                  onProfile?.();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <UserRoundIcon />
                Manage your profile
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          {onLogout ? (
            <DropdownMenuItem
              className="h-12 gap-3 rounded-none px-4"
              onSelect={(event) => {
                event.preventDefault();
                setOpen(false);
                void onLogout();
              }}
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          ) : logoutHref ? (
            <DropdownMenuItem asChild className="h-12 gap-3 rounded-none px-4">
              <a href={logoutHref}>
                <LogOutIcon />
                Sign out
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="h-12 gap-3 rounded-none px-4" disabled>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserAvatar({ user, className }: { user: TopMenuUser; className: string }) {
  return (
    <Avatar className={className}>
      {user.avatarSrc ? <AvatarImage alt={user.name} src={user.avatarSrc} /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {user.fallback}
      </AvatarFallback>
    </Avatar>
  );
}
