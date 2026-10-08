import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { WatchRepository } from "./watch.repository.js";
import { WatchService } from "./watch.service.js";

test("Zuno watch reports backup freshness and latency from existing records", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zuno-watch-"));
  const logPath = join(directory, "platform.log");
  await writeFile(
    logPath,
    [
      "[response] GET /api/health 200 100ms request=1",
      "[response] GET /api/problem 500 2000ms request=2"
    ].join("\n")
  );
  try {
    const service = new WatchService(
      new WatchRepository({
        sourceRoot: "",
        platformLogPath: logPath,
        providerBaseUrl: "",
        providerModel: "",
        providerApiKey: ""
      }),
      async () => ({
        targets: [
          {
            scope: "tenant",
            name: "sample",
            databaseStatus: "online",
            runs: [
              {
                operation: "backup",
                status: "completed",
                completedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              }
            ]
          }
        ],
        queueJobs: [{ status: "failed", createdAt: new Date().toISOString() }]
      })
    );
    const snapshot = await service.snapshot();
    assert.equal(snapshot.targets[0]?.backupStatus, "fresh");
    assert.equal(snapshot.queue.failed, 1);
    assert.deepEqual(snapshot.api, { responseCount: 2, errorCount: 1, p95Ms: 2000 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
