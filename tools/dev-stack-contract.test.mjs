import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { previousPreflightPids, takeoverTarget } from "./dev-port-ownership.mjs";

const [
  packageSource,
  stackSource,
  preflightSource,
  appRegistrySource,
  appDeskSource,
  platformApiTsconfigSource,
  platformWebTsconfigSource,
  platformWebViteSource
] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("./dev-stack.mjs", import.meta.url), "utf8"),
  readFile(new URL("./preflight.mjs", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/src/app/app-registry.ts", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/src/desks/tenant/AppDesk.tsx", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/api/tsconfig.json", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/tsconfig.json", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/vite.config.ts", import.meta.url), "utf8")
]);
const packageJson = JSON.parse(packageSource);
const platformApiTsconfig = JSON.parse(platformApiTsconfigSource);
const platformWebTsconfig = JSON.parse(platformWebTsconfigSource);

test("development commands keep API and web watchers independently available", () => {
  assert.equal(packageJson.scripts.dev, "node tools/dev-stack.mjs");
  assert.equal(packageJson.scripts["dev:api"], "node tools/preflight.mjs platform-api");
  assert.equal(packageJson.scripts["dev:web"], "node tools/preflight.mjs platform-web");
  assert.match(preflightSource, /watchApiSources\(\)/u);
  assert.doesNotMatch(preflightSource, /"--watch"/u);
  assert.match(preflightSource, /nodePackageBin\("vite", "bin\/vite\.js"\)/u);
});

test("API development resolves linked owner packages through the root dependency tree", () => {
  assert.match(preflightSource, /register-root-package-resolution\.mjs/u);
  assert.match(preflightSource, /"--import",\s*"tsx"/u);
  assert.equal(platformApiTsconfig.compilerOptions.preserveSymlinks, true);
});

test("web development keeps linked owner source and styles on the root dependency path", () => {
  assert.equal(platformWebTsconfig.compilerOptions.preserveSymlinks, true);
  assert.match(platformWebViteSource, /preserveSymlinks:\s*true/u);
});

test("tenant app breadcrumbs use app IDs and canonical root pages", () => {
  assert.match(appRegistrySource, /appId:\s*app\.id/u);
  assert.match(appRegistrySource, /url:\s*appRootUrl\(app\.id\)/u);
  assert.match(appDeskSource, /requestListNavigation\(pageForApp\(item\.appId\)\)/u);
  assert.doesNotMatch(appDeskSource, /item\.title\s*===/u);
});

test("combined development runtime restarts one service without stopping its sibling", () => {
  assert.match(stackSource, /restartService\(serviceName, "process exit"\)/u);
  assert.match(stackSource, /restartService\(serviceName, "failed health checks"\)/u);
  assert.match(stackSource, /await waitForPreflight\(child, service\.label\)/u);
  assert.match(preflightSource, /cxsun:preflight-ready/u);
  assert.match(preflightSource, /env\.CXSUN_DEV_PORT_POLICY \?\? "takeover"/u);
  assert.doesNotMatch(stackSource, /stopChildren\(child\)/u);
});

test("port takeover stops the old watcher tree and its supervisor", () => {
  const processes = new Map([
    [10, { pid: 10, parentPid: 20, name: "node.exe", commandLine: "node src/server.ts" }],
    [20, { pid: 20, parentPid: 30, name: "node.exe", commandLine: "node --watch src/server.ts" }],
    [
      30,
      {
        pid: 30,
        parentPid: 40,
        name: "node.exe",
        commandLine: "node tools/preflight.mjs platform-api"
      }
    ],
    [40, { pid: 40, parentPid: 0, name: "node.exe", commandLine: "node tools/dev-stack.mjs" }],
    [
      50,
      {
        pid: 50,
        parentPid: 0,
        name: "node.exe",
        commandLine: "node tools/preflight.mjs platform-api"
      }
    ],
    [
      60,
      {
        pid: 60,
        parentPid: 30,
        name: "cmd.exe",
        commandLine: "cmd /c node tools/preflight.mjs platform-api"
      }
    ]
  ]);
  assert.equal(takeoverTarget(10, processes, "platform-api", 50), 40);
  processes.set(50, {
    pid: 50,
    parentPid: 40,
    name: "node.exe",
    commandLine: "node tools/preflight.mjs platform-api"
  });
  assert.equal(takeoverTarget(10, processes, "platform-api", 50), 30);
  assert.equal(takeoverTarget(10, processes, "platform-web", 50), null);
  assert.equal(takeoverTarget(999, processes, "platform-api", 50), null);
  assert.deepEqual(previousPreflightPids(processes, "platform-api", 50), [30]);
});

test("development shutdown asks the child to stop before forcing termination", () => {
  const gracefulStop = stackSource.indexOf('child.send({ type: "cxsun:shutdown" })');
  const forcedStop = stackSource.indexOf('spawnSync("taskkill"');
  assert.ok(gracefulStop >= 0, "The supervisor must request a graceful child shutdown.");
  assert.ok(forcedStop > gracefulStop, "Forced termination must remain a fallback.");
  assert.match(preflightSource, /message\?\.type === "cxsun:shutdown"/u);
  assert.match(preflightSource, /requestDevApiShutdown\(controlFile, controlToken\)/u);
  assert.match(preflightSource, /await stopCurrentChild\(signal\)/u);
});

test("configured ports and API readiness govern startup", () => {
  assert.match(
    stackSource,
    /requiredDevPort\(\s*process\.env\.PLATFORM_API_PORT \?\? env\.PLATFORM_API_PORT/u
  );
  assert.match(
    stackSource,
    /requiredDevPort\(\s*process\.env\.PLATFORM_WEB_PORT \?\? env\.PLATFORM_WEB_PORT/u
  );
  assert.match(stackSource, /readyUrl: `http:\/\/127\.0\.0\.1:\$\{apiPort\}\/ready`/u);
  assert.match(preflightSource, /`http:\/\/127\.0\.0\.1:\$\{apiPort\}\/ready`/u);
});
