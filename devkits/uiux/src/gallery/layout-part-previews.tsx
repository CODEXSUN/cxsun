import { useState } from "react";
import { BlocksIcon, BookOpenIcon, LayoutTemplateIcon, PanelsTopLeftIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import {
  AppLayout,
  SideMenu,
  StatusBar,
  TopMenu,
  WorkspaceCanvas,
  type MainLayoutNavigationSection
} from "@cxsun/ui/layouts/main-layouts";
import { galleryApps, galleryUser } from "./main-layout-fixtures";

const navigation: MainLayoutNavigationSection[] = [
  {
    label: "Layouts",
    icon: LayoutTemplateIcon,
    items: [
      { label: "Main Layout", icon: PanelsTopLeftIcon },
      { label: "Documentation Workspace", icon: BookOpenIcon }
    ]
  },
  {
    label: "Blocks",
    icon: BlocksIcon,
    items: [{ label: "Workspace Status" }, { label: "App Header" }]
  }
];

export function AppLayoutPreview() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Overview");
  const [action, setAction] = useState("Ready");

  return (
    <AppLayout className="h-[min(60vh,30rem)] min-h-72">
      <TopMenu
        appItems={galleryApps}
        applicationName="UI"
        notificationCount={2}
        onCloseSearch={() => {
          setSearchOpen(false);
          setSearch("");
        }}
        onOpenSearch={() => setSearchOpen(true)}
        onLogout={() => setAction("Sign out preview")}
        onProfile={() => setAction("Profile preview")}
        onSearchChange={setSearch}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        search={search}
        searchOpen={searchOpen}
        searchPlaceholder="Search navigation"
        user={galleryUser}
      />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen ? (
          <SideMenu
            navigation={navigation}
            onSelect={setSelected}
            search={search}
            selected={selected}
            workspaceTitle="Overview"
          />
        ) : null}
        <WorkspaceCanvas>
          <div className="p-6 text-sm text-muted-foreground">{selected} workspace canvas</div>
        </WorkspaceCanvas>
      </div>
      <StatusBar status={action} workspace={selected} />
    </AppLayout>
  );
}

export function TopMenuPreview() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [action, setAction] = useState("");

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  return (
    <div className="min-h-56">
      <TopMenu
        appItems={galleryApps}
        applicationName="UI"
        notificationCount={2}
        onCloseSearch={closeSearch}
        onOpenSearch={() => setSearchOpen(true)}
        onLogout={() => setAction("Sign out preview")}
        onProfile={() => setAction("Profile preview")}
        onSearchChange={setSearch}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        search={search}
        searchOpen={searchOpen}
        searchPlaceholder="Search navigation"
        user={galleryUser}
      />
      <div className="p-5 text-sm text-muted-foreground">
        Navigation: {sidebarOpen ? "open" : "closed"}
        {search ? ` · Search: ${search}` : null}
        {action ? ` · ${action}` : null}
      </div>
    </div>
  );
}

export function SideMenuPreview() {
  const [selected, setSelected] = useState("Overview");
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-[min(60vh,30rem)] min-h-72">
      <SideMenu
        navigation={navigation}
        onSelect={setSelected}
        search={search}
        selected={selected}
        workspaceTitle="Overview"
      />
      <div className="min-w-0 flex-1 p-5">
        <label className="grid max-w-72 gap-2 text-sm">
          <span>Filter navigation</span>
          <input
            className="h-9 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search items"
            value={search}
          />
        </label>
        <p className="mt-5 text-sm text-muted-foreground">Selected: {selected}</p>
      </div>
    </div>
  );
}

export function StatusBarPreview() {
  const [status, setStatus] = useState("Ready");
  const [workspace, setWorkspace] = useState("Overview");

  return (
    <div className="flex h-56 flex-col">
      <div className="flex flex-1 flex-wrap content-start gap-3 p-5">
        <Button
          onClick={() => setStatus((current) => (current === "Ready" ? "Working" : "Ready"))}
          size="sm"
          type="button"
          variant="outline"
        >
          Change status
        </Button>
        <Button
          onClick={() =>
            setWorkspace((current) => (current === "Overview" ? "Main Layout" : "Overview"))
          }
          size="sm"
          type="button"
          variant="outline"
        >
          Change workspace
        </Button>
      </div>
      <StatusBar status={status} workspace={workspace} />
    </div>
  );
}
