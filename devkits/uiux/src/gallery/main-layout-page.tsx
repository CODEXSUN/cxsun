import { useState } from "react";
import {
  BlocksIcon,
  BookOpenIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  Columns3Icon,
  CopyIcon,
  FileTextIcon,
  FolderTreeIcon,
  LayoutTemplateIcon,
  PanelsTopLeftIcon,
  Table2Icon
} from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { MainLayout, type MainLayoutNavigationSection } from "@cxsun/ui/layouts/main-layouts";
import { galleryApps, galleryUser } from "./main-layout-fixtures";

const importPath = "@cxsun/ui/layouts/main-layouts";

const navigation: MainLayoutNavigationSection[] = [
  {
    label: "Layouts",
    icon: LayoutTemplateIcon,
    items: [
      { label: "Main Layout", icon: PanelsTopLeftIcon },
      { label: "Documentation Workspace", icon: BookOpenIcon },
      { label: "Agent Workspace", icon: BotIcon }
    ]
  },
  {
    label: "Blocks",
    icon: BlocksIcon,
    items: [
      { label: "Workspace Status" },
      { label: "Workspace Entity Card" },
      { label: "Execution Status", icon: BotIcon },
      { label: "Table", icon: Table2Icon },
      { label: "Form", icon: FileTextIcon },
      { label: "App Header" },
      { label: "Kanban Board", icon: Columns3Icon },
      { label: "File Tree", icon: FolderTreeIcon }
    ]
  }
];

const usageCode = `import { LayoutTemplateIcon, PanelsTopLeftIcon } from "lucide-react";
import { MainLayout } from "@cxsun/ui/layouts/main-layouts";

const navigation = [{
  label: "Layouts",
  icon: LayoutTemplateIcon,
  items: [{ label: "Main Layout", icon: PanelsTopLeftIcon }]
}];

export function ApplicationShell() {
  return (
    <MainLayout
      appItems={apps}
      applicationName="UI"
      navigation={navigation}
      notificationCount={2}
      statusLabel="Ready"
      workspaceTitle="Overview"
      user={signedInUser}
    >
      {/* Application page content */}
    </MainLayout>
  );
}`;

export function MainLayoutPage() {
  const [copied, setCopied] = useState<"path" | "code" | null>(null);
  const [demoStatus, setDemoStatus] = useState("Ready");

  async function copy(value: string, target: "path" | "code") {
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">Layout</span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
          <h1 className="font-semibold">Main Layout</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="max-w-[70vw] truncate rounded-md bg-muted px-3 py-2 text-xs">
            {importPath}
          </code>
          <Button
            aria-label="Copy import path"
            onClick={() => void copy(importPath, "path")}
            size="icon"
            type="button"
            variant="ghost"
          >
            {copied === "path" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Button>
        </div>
      </header>

      <section
        aria-label="Main Layout live preview"
        className="overflow-hidden rounded-md border bg-background shadow-sm"
      >
        <div className="flex h-9 items-center gap-1 border-b px-4">
          <span className="size-2 rounded-full bg-rose-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Main Layout
          </span>
        </div>
        <MainLayout
          appItems={galleryApps}
          applicationName="UI"
          className="h-[min(67vh,44rem)] min-h-[28rem]"
          navigation={navigation}
          notificationCount={2}
          onLogout={() => setDemoStatus("Sign out preview")}
          onProfile={() => setDemoStatus("Profile preview")}
          statusLabel={demoStatus}
          workspaceTitle="Overview"
          user={galleryUser}
        />
      </section>

      <section aria-labelledby="main-layout-code" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="main-layout-code" className="text-lg font-semibold">
            Usage code
          </h2>
          <Button
            onClick={() => void copy(usageCode, "code")}
            size="sm"
            type="button"
            variant="outline"
          >
            {copied === "code" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-6">
          <code>{usageCode}</code>
        </pre>
      </section>
    </div>
  );
}
