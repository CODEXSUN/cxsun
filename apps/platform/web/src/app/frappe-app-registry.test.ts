import assert from "node:assert/strict";
import test from "node:test";
import { appRootUrl, enabledAppIds } from "./app-registry";

test("Frappe opens as a separate app only when CRM and Frappe are enabled", () => {
  assert.equal(appRootUrl("frappe"), "/app/frappe/overview");
  assert.equal(enabledAppIds(["crm", "frappe"]).includes("frappe"), true);
  assert.equal(enabledAppIds(["crm"]).includes("frappe"), false);
  assert.equal(enabledAppIds(["frappe"]).includes("frappe"), false);
});
