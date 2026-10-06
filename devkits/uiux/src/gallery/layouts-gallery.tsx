import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@cxsun/ui/components/badge";
import { GalleryCard, SectionHeading } from "./gallery-card";
import { galleryPageUrl } from "./gallery-routes";

const layouts = [
  {
    name: "MainLayout",
    role: "Post-auth application shell composition",
    path: "@cxsun/ui/layouts/main-layouts",
    route: "/sa/uiux?uiux=main-layouts"
  },
  {
    name: "AppLayout",
    role: "Base desk shell",
    path: "@cxsun/ui/layouts/app-layout",
    route: "/app"
  },
  {
    name: "ApplicationLayout",
    role: "Tenant application desk",
    path: "@cxsun/ui/layouts/application-layout",
    route: "/app"
  },
  {
    name: "AdminLayout",
    role: "Staff administration desk",
    path: "@cxsun/ui/layouts/admin-layout",
    route: "/admin"
  },
  {
    name: "SuperLayout",
    role: "Super Admin desk",
    path: "@cxsun/ui/layouts/super-layout",
    route: "/sa"
  },
  {
    name: "AuthLayout",
    role: "Login and recovery pages",
    path: "@cxsun/ui/layouts/auth-layout",
    route: "/login"
  },
  {
    name: "WebLayout",
    role: "Public pages",
    path: "@cxsun/ui/layouts/web-layout",
    route: "/"
  }
] as const;

export function LayoutsGallery({ deskRoutesAvailable }: { deskRoutesAvailable: boolean }) {
  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Layouts"
        description="The current layout exports stay in @cxsun/ui. New layout work can be compared here before a desk adopts it."
      />
      <GalleryCard
        title="Current desk anatomy"
        description="The base shell composes navigation, a page header, and a content canvas."
      >
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="flex h-10 items-center justify-between border-b bg-card px-4 text-xs font-medium">
            <span>CODEXSUN</span>
            <span className="text-muted-foreground">Top menu · account</span>
          </div>
          <div className="grid min-h-48 grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="border-r bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="rounded bg-primary/10 px-2 py-1.5 text-primary">Navigation</div>
              <div className="px-2 py-2">Sections</div>
              <div className="px-2 py-2">Settings</div>
            </div>
            <div className="min-w-0 p-4">
              <div className="h-5 w-36 rounded bg-foreground/15" />
              <div className="mt-2 h-3 w-52 max-w-full rounded bg-muted" />
              <div className="mt-5 h-20 rounded-md border bg-card" />
            </div>
          </div>
        </div>
      </GalleryCard>
      <div className="grid gap-4 md:grid-cols-2">
        {layouts.map((layout) => (
          <article className="rounded-lg border bg-card p-5" key={layout.name}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">{layout.name}</h3>
              <Badge variant="outline">Current</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{layout.role}</p>
            <code className="mt-3 block break-all text-xs text-primary">{layout.path}</code>
            {deskRoutesAvailable ? (
              <a
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                href={layout.route}
              >
                Open route <ArrowUpRightIcon className="size-4" />
              </a>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                {layout.name === "MainLayout" ? "Gallery route" : "Desk route"}: {layout.name === "MainLayout"
                  ? galleryPageUrl("main-layouts")
                  : layout.route}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
