export type QuotationRoute =
  { mode: "list" } | { mode: "new" } | { mode: "show" | "edit" | "print"; id: string };

export function quotationRouteFromPath(pathname: string): QuotationRoute {
  const segments = pathname.split("/").filter(Boolean);
  const offset = segments[0] === "app" ? 1 : 0;
  if (segments[offset] !== "billing" || segments[offset + 1] !== "quotation") {
    return { mode: "list" };
  }
  const id = segments[offset + 2];
  const action = segments[offset + 3];
  if (segments.length > offset + 4) return { mode: "list" };
  if (!id) return { mode: "list" };
  if (id === "new" && !action) return { mode: "new" };
  let decodedId: string;
  try {
    decodedId = decodeURIComponent(id);
  } catch {
    return { mode: "list" };
  }
  if (action === "edit" || action === "print" || action === "show") {
    return { id: decodedId, mode: action };
  }
  return action ? { mode: "list" } : { id: decodedId, mode: "show" };
}

export function quotationRoutePath(route: QuotationRoute, tenantDesk: boolean): string {
  const base = `${tenantDesk ? "/app" : ""}/billing/quotation`;
  if (route.mode === "list") return base;
  if (route.mode === "new") return `${base}/new`;
  const record = `${base}/${encodeURIComponent(route.id)}`;
  return route.mode === "show" ? record : `${record}/${route.mode}`;
}
