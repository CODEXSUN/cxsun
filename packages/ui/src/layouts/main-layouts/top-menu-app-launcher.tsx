import { CheckIcon, GripIcon } from "lucide-react";
import { Button } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../components/dropdown-menu";
import type { TopMenuAppItem } from "./top-menu-types";

export function TopMenuAppLauncher({ items }: { items: TopMenuAppItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Apps"
          className="size-9 rounded-full p-0 ring-2 ring-primary/20 ring-offset-1 ring-offset-background"
          size="icon"
          variant="ghost"
        >
          <GripIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-[1.75rem] border bg-popover p-3 text-popover-foreground shadow-2xl"
        sideOffset={10}
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-medium">Apps</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-background p-2 shadow-sm">
          {items.map((item) => (
            <DropdownMenuItem
              asChild={Boolean(item.url && !item.onSelect)}
              className="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl p-2 text-center"
              key={item.title}
              {...(item.onSelect
                ? {
                    onSelect: (event) => {
                      event.preventDefault();
                      item.onSelect?.();
                    }
                  }
                : {})}
            >
              {item.url && !item.onSelect ? (
                <a href={item.url} title={item.description}>
                  <AppTile item={item} />
                </a>
              ) : (
                <button title={item.description} type="button">
                  <AppTile item={item} />
                </button>
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppTile({ item }: { item: TopMenuAppItem }) {
  return (
    <>
      <div
        className={`relative flex size-11 items-center justify-center rounded-xl border bg-background shadow-sm ${item.active ? "border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/10" : ""}`}
      >
        <item.icon className="size-5" />
        {item.active ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-2.5" />
          </span>
        ) : null}
      </div>
      <span className="w-full truncate text-xs font-medium">{item.title}</span>
    </>
  );
}
