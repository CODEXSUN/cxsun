# Main Layout

`MainLayout` is the application shell shown after authentication. `AppLayout`
contains its five required regions in this screen order:

```text
AppLayout
├── TopMenu
├── Body
│   ├── SideMenu
│   └── Workspace
│       ├── AppHeader
│       └── WorkspaceCanvas
└── StatusBar
```

| Region | Shared component | Technical name |
| --- | --- | --- |
| Top menu | `TopMenu` | `main.topMenu` |
| Side menu | `SideMenu` or the existing `AppSidebar` | `main.sideBar` |
| App header | `AppHeader` | `main.AppHeader` |
| Workspace | `WorkspaceCanvas` or the host's page canvas | `main.workspace` |
| Status bar | `StatusBar` | `main.StatusBar` |

These technical names are case-sensitive. Import their values from one source:

```ts
import { mainLayoutTechnicalNames } from "@cxsun/ui/layouts/main-layouts";

mainLayoutTechnicalNames.appHeader; // "main.AppHeader"
```

Use the shared names in interface topology and other references to shell regions.
`AppLayout` contains the five regions; it is not a region itself. The shell's
`AppHeader` is separate from a page's `WorkspaceHeader`.

The host authenticates the user before rendering the shell. It supplies
navigation, page content, signed-in user details, app launcher items, and
notifications. `MainLayout` coordinates sidebar visibility, navigation search,
and the selected workspace label. `onNotificationDismiss` removes a notification
from the host's list. Profile and sign-out actions use `profileHref`/`logoutHref`
or `onProfile`/`onLogout`. Search opens a command popup from the top menu or
Ctrl/⌘ K.

New or updated post-auth desk shells must include all five regions. The UIUX
gallery demonstrates the composition with its existing `AppSidebar` and live
workspace. Existing desk layouts and `@cxsun/ui/layouts/app-layout` remain
separate until their hosts adopt this contract.
