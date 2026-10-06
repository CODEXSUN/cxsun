import { useState } from "react";
import { ChevronDownIcon, CircleHelpIcon, LayoutDashboardIcon, Settings2Icon } from "lucide-react";
import type { MainLayoutNavigationSection } from "./types";

export type SideMenuProps = {
  navigation: MainLayoutNavigationSection[];
  onSelect: (label: string) => void;
  search: string;
  selected: string;
  workspaceTitle: string;
};

export function SideMenu({
  navigation,
  onSelect,
  search,
  selected,
  workspaceTitle
}: SideMenuProps) {
  const [openSections, setOpenSections] = useState<string[]>(navigation.map(({ label }) => label));

  function toggleSection(label: string) {
    setOpenSections((current) =>
      current.includes(label) ? current.filter((entry) => entry !== label) : [...current, label]
    );
  }

  const visibleNavigation = navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
  }));

  return (
    <aside
      aria-label="Application navigation"
      className="flex w-56 shrink-0 flex-col border-r bg-muted/20 sm:w-64"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <button
          aria-current={selected === workspaceTitle ? "page" : undefined}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${selected === workspaceTitle ? "bg-muted font-medium" : "hover:bg-muted"}`}
          onClick={() => onSelect(workspaceTitle)}
          type="button"
        >
          <LayoutDashboardIcon className="size-4 shrink-0" /> {workspaceTitle}
        </button>
        {visibleNavigation.map((section) => {
          const Icon = section.icon ?? CircleHelpIcon;
          const open = openSections.includes(section.label) || Boolean(search);
          return (
            <div className="pt-4" key={section.label}>
              <button
                aria-expanded={open}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
                onClick={() => toggleSection(section.label)}
                type="button"
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{section.label}</span>
                <ChevronDownIcon
                  className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
                />
              </button>
              {open ? (
                <div className="ml-5 border-l pl-2">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        aria-current={selected === item.label ? "page" : undefined}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selected === item.label ? "bg-muted font-medium" : "hover:bg-muted"}`}
                        key={item.label}
                        onClick={() => {
                          onSelect(item.label);
                          item.onSelect?.();
                        }}
                        type="button"
                      >
                        {ItemIcon ? (
                          <ItemIcon className="size-4 shrink-0" />
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        className="flex items-center gap-3 border-t px-6 py-3 text-left text-sm hover:bg-muted"
        onClick={() => onSelect("Settings")}
        type="button"
      >
        <Settings2Icon className="size-4" /> Settings
      </button>
    </aside>
  );
}
