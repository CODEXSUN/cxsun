import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { captureApiInputs, changedApiInputs } from "./dev-api-source-changes.mjs";

test("API watcher restarts only for changed source or environment content", async () => {
  const root = await mkdtemp(join(tmpdir(), "cxsun-api-watch-"));
  const sourceDirectory = join(root, "apps/platform/api/src");
  const sourceFile = join(sourceDirectory, "server.ts");
  const envFile = join(root, ".env");

  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, "export const ready = true;\n");
    await writeFile(envFile, "PLATFORM_API_PORT=7010\n");
    const initial = await captureApiInputs(root);

    await utimes(sourceFile, new Date(), new Date());
    assert.deepEqual(changedApiInputs(initial, await captureApiInputs(root)), []);

    await writeFile(sourceFile, "export const ready = false;\n");
    const changedSource = await captureApiInputs(root);
    assert.deepEqual(changedApiInputs(initial, changedSource), ["apps/platform/api/src/server.ts"]);
    assert.deepEqual(changedApiInputs(changedSource, await captureApiInputs(root)), []);

    await writeFile(envFile, "PLATFORM_API_PORT=7011\n");
    const changedEnv = await captureApiInputs(root);
    assert.deepEqual(changedApiInputs(changedSource, changedEnv), [".env"]);

    await rm(sourceFile);
    assert.deepEqual(changedApiInputs(changedEnv, await captureApiInputs(root)), [
      "apps/platform/api/src/server.ts"
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
