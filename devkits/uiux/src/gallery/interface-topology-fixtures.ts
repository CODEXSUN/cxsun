import type { InterfaceTopologyDesk } from "@cxsun/ui/features/interface-topology";
import { mainLayoutTechnicalNames } from "@cxsun/ui/layouts/main-layouts";

export const mainLayoutTopologyDesks: readonly InterfaceTopologyDesk[] = [
  {
    id: "uiux-main-layout",
    name: "Main Layout",
    sectionHeading: "App Layout",
    sections: [
      {
        id: "S01",
        name: "Top Menu",
        description: "Search, notifications, app launcher, and account controls.",
        scope: "Main Layout",
        technicalName: mainLayoutTechnicalNames.topMenu
      },
      {
        id: "S02",
        name: "Side Menu",
        description: "The original gallery sidebar and its grouped navigation.",
        scope: "Main Layout",
        technicalName: mainLayoutTechnicalNames.sideBar
      },
      {
        id: "S03",
        name: "App Header",
        description: "Home navigation, page breadcrumb, and application name.",
        scope: "Main Layout",
        technicalName: mainLayoutTechnicalNames.appHeader
      },
      {
        id: "S04",
        name: "Workspace Canvas",
        description: "The page content area alongside the application sidebar.",
        scope: "Main Layout",
        technicalName: mainLayoutTechnicalNames.workspace
      },
      {
        id: "S05",
        name: "Status Bar",
        description: "The current workspace and application status.",
        scope: "Main Layout",
        technicalName: mainLayoutTechnicalNames.statusBar
      }
    ]
  }
];
