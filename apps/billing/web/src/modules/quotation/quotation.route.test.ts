import assert from "node:assert/strict";
import test from "node:test";
import { quotationRouteFromPath, quotationRoutePath } from "./quotation.route";

test("quotation URLs preserve the list, new, record, edit, and print views", () => {
  const routes = [
    { path: "/app/billing/quotation", route: { mode: "list" } },
    { path: "/app/billing/quotation/new", route: { mode: "new" } },
    { path: "/app/billing/quotation/1", route: { id: "1", mode: "show" } },
    { path: "/app/billing/quotation/1/edit", route: { id: "1", mode: "edit" } },
    { path: "/app/billing/quotation/1/print", route: { id: "1", mode: "print" } }
  ] as const;

  for (const { path, route } of routes) {
    assert.deepEqual(quotationRouteFromPath(path), route);
    assert.equal(quotationRoutePath(route, true), path);
  }
});
