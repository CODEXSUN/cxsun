import { useState } from "react";
import { BookOpenIcon, PanelsTopLeftIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { AppHeader, StatusBar, TopMenu } from "@cxsun/ui/layouts/main-layouts";
import { galleryApps, galleryNotifications, galleryUser } from "./main-layout-fixtures";
import { galleryPageUrl } from "./gallery-routes";

export function AppLayoutPreview() {
  return (
    <iframe
      className="h-[min(65vh,36rem)] min-h-96 w-full"
      src={galleryPageUrl("app-layout", "main-layout")}
      title="App Layout live preview"
    />
  );
}

export function AppHeaderPreview() {
  return (
    <AppHeader
      breadcrumbs={[{ label: "Main Layout" }]}
      homeHref={galleryPageUrl("main-layouts")}
      name="UIUX"
    />
  );
}

export function TopMenuPreview() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [action, setAction] = useState("");
  const [notifications, setNotifications] = useState(galleryNotifications);

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  return (
    <div className="min-h-56">
      <TopMenu
        appItems={galleryApps.map((item) => ({ ...item, url: galleryPageUrl("main-layouts") }))}
        applicationName="UI"
        notifications={notifications}
        onCloseSearch={closeSearch}
        onOpenSearch={() => setSearchOpen(true)}
        onLogout={() => setAction("Sign out preview")}
        onNotificationDismiss={(id) =>
          setNotifications((current) => current.filter((entry) => entry.id !== id))
        }
        onProfile={() => setAction("Profile preview")}
        onSearchChange={setSearch}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        search={search}
        searchItems={[
          {
            label: "Go to Main Layout",
            description: "Open the layout preview",
            icon: PanelsTopLeftIcon,
            onSelect: () => setAction("Main Layout selected")
          },
          {
            label: "Go to Documentation Workspace",
            description: "Open a workspace",
            icon: BookOpenIcon,
            onSelect: () => setAction("Documentation Workspace selected")
          },
          {
            label: "Toggle sidebar",
            description: "Show or hide navigation",
            onSelect: () => setSidebarOpen((open) => !open)
          }
        ]}
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
