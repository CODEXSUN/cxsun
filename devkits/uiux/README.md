# UIUX Gallery

`@cxsun/uiux` is a visual gallery for the public `@cxsun/ui` design system. It
owns examples and documentation, while `packages/ui` owns reusable controls,
workspace blocks, layouts, and tokens.

The Super Admin desk opens the gallery at `/sa/uiux`. UIUX owns its grouped
sidebar, top menu, and page canvas. Main Layout, available at
`?uiux=main-layouts`, shows the composed app base, top menu, side menu,
workspace canvas, and status bar with usage code. The existing
component catalog remains at `/sa/design-system`.

The **Main Layout parts** sidebar group has live pages for App Layout,
Top Menu, Side Menu, and Status Bar (`?uiux=app-layout`, `?uiux=top-menu`,
`?uiux=side-menu`, and `?uiux=status-bar`). Each page imports the real component
from `@cxsun/ui/layouts/main-layouts` and provides controls for its behavior.

From the repository root, run `npm run dev -w @cxsun/uiux` to open the standalone
gallery at `http://127.0.0.1:7030`. Run `npm run typecheck -w @cxsun/uiux` and
`npm run build -w @cxsun/uiux` to check it.

The standalone gallery uses only local specimen data. It has no API, database,
or authentication surface. The embedded desk route uses the Super Admin desk's
existing access gate.
