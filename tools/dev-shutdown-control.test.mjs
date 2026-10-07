import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startDevShutdownControl } from "../apps/platform/api/src/dev-shutdown.ts";
import { requestProcessStop, startProcessControl } from "./dev-process-control.mjs";
import { requestDevApiShutdown } from "./dev-shutdown-client.mjs";

test("API dev shutdown channel accepts only its token and removes its address", async () => {
  const file = join(tmpdir(), `cxsun-shutdown-test-${randomUUID()}.json`);
  const token = randomUUID();
  const previousFile = process.env.CXSUN_DEV_SHUTDOWN_FILE;
  const previousToken = process.env.CXSUN_DEV_SHUTDOWN_TOKEN;
  process.env.CXSUN_DEV_SHUTDOWN_FILE = file;
  process.env.CXSUN_DEV_SHUTDOWN_TOKEN = token;
  let stopCount = 0;
  let closeControl;

  try {
    closeControl = await startDevShutdownControl(() => stopCount++);
    assert.equal(await requestDevApiShutdown(file, "wrong-token"), false);
    assert.equal(stopCount, 0);
    assert.equal(await requestDevApiShutdown(file, token), true);
    await new Promise((resolveWait) => setImmediate(resolveWait));
    assert.equal(stopCount, 1);
    await closeControl();
    assert.rejects(readFile(file, "utf8"), { code: "ENOENT" });
  } finally {
    if (closeControl) await closeControl();
    await rm(file, { force: true });
    if (previousFile === undefined) delete process.env.CXSUN_DEV_SHUTDOWN_FILE;
    else process.env.CXSUN_DEV_SHUTDOWN_FILE = previousFile;
    if (previousToken === undefined) delete process.env.CXSUN_DEV_SHUTDOWN_TOKEN;
    else process.env.CXSUN_DEV_SHUTDOWN_TOKEN = previousToken;
  }
});

test("an existing dev runner can acknowledge a graceful takeover", async () => {
  let stopCount = 0;
  const closeControl = await startProcessControl("test", () => stopCount++);
  try {
    assert.equal(await requestProcessStop("test", process.pid), true);
    await new Promise((resolveWait) => setImmediate(resolveWait));
    assert.equal(stopCount, 1);
  } finally {
    await closeControl();
  }
  assert.equal(await requestProcessStop("test", process.pid), false);
});
