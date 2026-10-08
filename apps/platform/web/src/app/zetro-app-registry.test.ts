import assert from "node:assert/strict";
import test from "node:test";
import { appRootUrl, enabledAppIds, platformAppRegistry } from "./app-registry";

test("Zetro appears only for tenants with the Zetro module", () => {
  assert.equal(appRootUrl("zetro"), "/app/zetro/chat");
  assert.equal(enabledAppIds(["zetro"]).includes("zetro"), true);
  assert.equal(enabledAppIds(["crm"]).includes("zetro"), false);
  assert.equal(platformAppRegistry.find((app) => app.id === "zetro")?.moduleKey, "zetro");
});
