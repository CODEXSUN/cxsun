import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DiagnosticsRepository } from "./diagnostics.repository.js";

test("Zuno reads bounded source and log evidence without exposing secrets or paths outside the mount", async () => {
  const sandbox = await mkdtemp(join(tmpdir(), "cxsun-zuno-"));
  try {
    const sourceRoot = join(sandbox, "source");
    await mkdir(sourceRoot);
    await writeFile(
      join(sourceRoot, "sample.ts"),
      'const issue = \'tenant 403\';\nconst token=topsecretvalue;\nconst config = { "apiKey": "quotedsecret" };\n'
    );
    await writeFile(join(sandbox, "outside.ts"), "outside secret");
    let symlinkAvailable = true;
    try {
      await symlink(join(sandbox, "outside.ts"), join(sourceRoot, "link.ts"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
      symlinkAvailable = false;
    }
    const platformLogPath = join(sandbox, "platform.log");
    await writeFile(
      platformLogPath,
      "request failed bearer abcdefghijklmnop\npassword=hiddenvalue\n"
    );
    const repository = new DiagnosticsRepository({
      sourceRoot,
      platformLogPath,
      providerBaseUrl: "https://example.test/v1",
      providerModel: "test",
      providerApiKey: "test"
    });
    assert.deepEqual(await repository.status(), {
      sourceReady: true,
      logReady: true,
      modelReady: true
    });
    assert.equal((await repository.searchCode("tenant 403"))[0]?.source, "sample.ts:1");
    assert.equal(await repository.readCode("../outside.ts"), null);
    if (symlinkAvailable) assert.equal(await repository.readCode("link.ts"), null);
    assert.match((await repository.readCode("sample.ts"))?.content ?? "", /token=\[REDACTED\]/u);
    assert.doesNotMatch((await repository.readCode("sample.ts"))?.content ?? "", /quotedsecret/u);
    const log = await repository.tailPlatformLog();
    assert.doesNotMatch(log?.content ?? "", /abcdefghijklmnop|hiddenvalue/u);
    assert.match(log?.content ?? "", /\[REDACTED\]/u);
    assert.equal(await readFile(join(sandbox, "outside.ts"), "utf8"), "outside secret");
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
