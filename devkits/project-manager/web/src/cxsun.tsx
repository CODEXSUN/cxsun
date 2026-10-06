import type { SidemenuItem } from "@cxsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@cxsun/ui/blocks/menu/sidemenu/top-menu";
import { DatabaseIcon, LightbulbIcon, WrenchIcon } from "lucide-react";
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { GlobalLoader } from "@cxsun/ui/components/global-loader";

export type ProjectManagerWorkspaceContribution = {
  component: LazyExoticComponent<ComponentType>;
  group: string;
  id: string;
  title: string;
};

const workspace = (
  id: string,
  title: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): ProjectManagerWorkspaceContribution => ({
  component: lazy(load),
  group,
  id,
  title
});

const workspaces = Object.freeze([
  workspace("registry", "Platform Registry", "Project Manager", () =>
    import("./modules/platform-registry").then((module) => ({
      default: module.PlatformRegistryWorkspace
    }))
  ),
  workspace("ideas", "Ideas", "Project Manager", () =>
    import("./modules/ideas").then((module) => ({ default: module.IdeasWorkspace }))
  )
]);

export const projectManagerWebBundle = Object.freeze({
  id: "project-manager",
  rootPath: "/sa/project-manager-registry",
  title: "Project Manager",
  version: "1.0.54",
  workspaces,
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Platform application and module registry.",
      icon: WrenchIcon,
      title: "Project Manager",
      url: "/sa/project-manager-registry"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: LightbulbIcon,
        isActive: activeWorkspaceId === "ideas",
        title: "Ideas",
        url: "/sa/project-manager-ideas"
      },
      {
        icon: DatabaseIcon,
        isActive: activeWorkspaceId === "registry",
        title: "Platform Registry",
        url: "/sa/project-manager-registry"
      }
    ];
  },
  resolveWorkspace(pathname: string): ProjectManagerWorkspaceContribution | undefined {
    const [surface, page] = pathname.split("/").filter(Boolean);
    if (surface !== "sa" || !page?.startsWith("project-manager-")) return undefined;
    const section = page.slice("project-manager-".length);
    return workspaces.find((entry) => entry.id === section);
  }
});

export function ProjectManagerWorkspaceHost({ workspaceId }: { workspaceId: string }) {
  const contribution = workspaces.find((entry) => entry.id === workspaceId);
  if (!contribution) return null;
  const Workspace = contribution.component;
  return (
    <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
      <Workspace />
    </Suspense>
  );
}
