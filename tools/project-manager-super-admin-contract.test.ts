import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  defaultTenantModuleKeys as apiDefaultTenantModuleKeys,
  resolveEnabledApps,
  resolveLandingApp
} from "../apps/platform/api/src/modules/app-registry/app-registry.service";
import {
  defaultTenantModuleKeys as webDefaultTenantModuleKeys,
  enabledAppIds
} from "../apps/platform/web/src/app/app-registry";

test("Project Manager is never resolved as a tenant application", () => {
  assert.equal(apiDefaultTenantModuleKeys.includes("project-manager" as never), false);
  assert.equal(webDefaultTenantModuleKeys.includes("project-manager" as never), false);
  assert.equal(
    resolveEnabledApps(["project-manager"]).some((app) => app.appId === "project-manager"),
    false
  );
  assert.equal(resolveLandingApp("project-manager", ["project-manager"]), "application");
  assert.equal(enabledAppIds(["project-manager"]).includes("project-manager"), false);
});

test("tenant desk and provisioning contain no Project Manager host surface", async () => {
  const [desk, registry, provisioning, host] = await Promise.all([
    readFile("apps/platform/web/src/desks/tenant/AppDesk.tsx", "utf8"),
    readFile("apps/platform/web/src/app/app-registry.ts", "utf8"),
    readFile("apps/platform/api/src/database/tenant-app-database.ts", "utf8"),
    readFile("apps/platform/api/src/project-manager-host.ts", "utf8")
  ]);

  assert.doesNotMatch(
    desk,
    /ProjectManagerWorkspaceHost|\/app\/project-manager\/registry|["']Project Manager["']/
  );
  assert.doesNotMatch(registry, /@cxsun\/project-manager-web/);
  assert.match(provisioning, /migrateProjectManagerDatabase/);
  assert.doesNotMatch(provisioning, /seedProjectManager|ProjectManagerWorkspaceHost/);
  assert.match(host, /Project Manager is available only to Super Admin\./);
  assert.doesNotMatch(host, /tenantAccessContext|roles: \["tenant"\]/);
});

test("Ideas is mounted through the Project Manager Super Admin workspace", async () => {
  const [desk, bundle, api] = await Promise.all([
    readFile("apps/platform/web/src/desks/sa/SaDesk.tsx", "utf8"),
    readFile("devkits/project-manager/web/src/cxsun.tsx", "utf8"),
    readFile("devkits/project-manager/api/src/app.ts", "utf8")
  ]);
  assert.match(desk, /project-manager-ideas/);
  assert.match(bundle, /IdeasWorkspace/);
  assert.match(api, /ideasModule\.register/);
});
