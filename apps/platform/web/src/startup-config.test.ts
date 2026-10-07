import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "./startup-config";

test("startup waits for a temporarily unavailable API", async () => {
  let attempts = 0;
  const config = await loadRuntimeConfig(async (url) => {
    assert.equal(url, "/api/app/public/runtime-config");
    attempts += 1;
    return Response.json(
      attempts === 1
        ? { success: false }
        : { success: true, data: { VITE_PLATFORM_API_URL: "/api/app" } },
      { status: attempts === 1 ? 503 : 200 }
    );
  });

  assert.equal(attempts, 2);
  assert.equal(config.VITE_PLATFORM_API_URL, "/api/app");
});

test("startup reports a persistent API failure", async () => {
  await assert.rejects(
    loadRuntimeConfig(async () => Response.json({ success: false }, { status: 503 }), 100),
    /Runtime configuration failed to load: 503/u
  );
});
