import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SearchIcon, XIcon, type LucideIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "../../components/command";
import { cn } from "../../lib/utils";

export type TopMenuSearchItem = {
  description?: string;
  icon?: LucideIcon;
  label: string;
  onSelect: () => void;
};

export type TopMenuSearchProps = {
  contentClassName?: string;
  items: TopMenuSearchItem[];
  onClose: () => void;
  onSearchChange: (value: string) => void;
  open: boolean;
  placeholder: string;
  search: string;
};

export function TopMenuSearch({
  contentClassName,
  items,
  onClose,
  onSearchChange,
  open,
  placeholder,
  search
}: TopMenuSearchProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/65 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none",
            contentClassName
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search workspace</DialogPrimitive.Title>
          <Command className="rounded-none">
            <div className="relative border-b pr-11">
              <CommandInput
                aria-label="Search workspace"
                className="h-14"
                onValueChange={onSearchChange}
                placeholder={placeholder}
                value={search}
              />
              <DialogPrimitive.Close
                aria-label="Close search"
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <CommandList className="max-h-[min(55vh,29rem)] p-2">
              <CommandEmpty>No matching commands.</CommandEmpty>
              <CommandGroup heading="Commands">
                {items.map((item, index) => {
                  const Icon = item.icon ?? SearchIcon;
                  return (
                    <CommandItem
                      className="min-h-12 gap-3 rounded-lg px-2 py-2 data-[selected=true]:bg-muted"
                      key={`${item.label}-${index}`}
                      onSelect={() => {
                        item.onSelect();
                        onClose();
                      }}
                      value={`${item.label} ${item.description ?? ""}`}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.label}</span>
                        {item.description ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="rounded border px-1">↑</kbd>{" "}
              <kbd className="rounded border px-1">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded border px-1">Enter</kbd> Open
            </span>
            <span>
              <kbd className="rounded border px-1">Esc</kbd> Close
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
