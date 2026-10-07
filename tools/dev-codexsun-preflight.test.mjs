import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { codexsunTakeoverTarget, previousPreflightPids } from "./dev-port-ownership.mjs";

test("Codexsun takeover finds its previous preflight without selecting another service", () => {
  const processes = new Map([
    [10, { pid: 10, parentPid: 20, name: "node.exe", commandLine: "node vite/bin/vite.js" }],
    [
      20,
      {
        pid: 20,
        parentPid: 0,
        name: "node.exe",
        commandLine: "node tools/preflight.mjs codexsun-web"
      }
    ],
    [
      30,
      {
        pid: 30,
        parentPid: 0,
        name: "node.exe",
        commandLine: "node tools/preflight.mjs platform-web"
      }
    ]
  ]);

  assert.equal(codexsunTakeoverTarget(10, processes), 20);
  assert.deepEqual(previousPreflightPids(processes, "codexsun-web", 40), [20]);
  assert.equal(codexsunTakeoverTarget(30, processes), null);
});

test("Codexsun takeover recognizes its npm runner and rejects unknown listeners", () => {
  const processes = new Map([
    [10, { pid: 10, parentPid: 20, name: "node.exe", commandLine: "node vite/bin/vite.js" }],
    [
      20,
      { pid: 20, parentPid: 0, name: "node.exe", commandLine: "node npm-cli.js run dev:codexsun" }
    ],
    [30, { pid: 30, parentPid: 0, name: "node.exe", commandLine: "node other-server.js" }]
  ]);

  assert.equal(codexsunTakeoverTarget(10, processes), 20);
  assert.equal(codexsunTakeoverTarget(30, processes), null);
});

test("root Codexsun command uses the preflight takeover", async () => {
  const source = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const scripts = JSON.parse(source).scripts;
  assert.equal(scripts["dev:codexsun"], "node tools/preflight.mjs codexsun-web");
});
