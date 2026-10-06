# Main Layout

`MainLayout` composes the post-auth application shell. The host application
authenticates the user before rendering it.

```text
AppLayout
├── TopMenu
├── SideMenu + WorkspaceCanvas
└── StatusBar
```

Import the composition or its parts from `@cxsun/ui/layouts/main-layouts`.
`MainLayout` coordinates sidebar visibility, navigation search, and the selected
workspace label. The host supplies navigation entries, page content, signed in
user details, and app launcher items. Profile and sign out actions use the
host's `profileHref`/`logoutHref` or `onProfile`/`onLogout` handlers.

The existing `@cxsun/ui/layouts/app-layout` and desk layouts remain separate.
