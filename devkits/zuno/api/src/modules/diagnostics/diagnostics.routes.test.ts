import assert from "node:assert/strict";
import test from "node:test";
import fastify from "fastify";
import { registerZunoApi } from "../../app.js";

test("Zuno rejects requests before calling diagnostic routes when the host denies access", async () => {
  const app = fastify();
  await registerZunoApi(app, {
    authorize() {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    },
    resolveCaseContext() {
      throw new Error("The unauthorized route must not resolve a case context.");
    },
    loadWatchSnapshot() {
      throw new Error("The unauthorized route must not load a watch snapshot.");
    },
    config: {
      sourceRoot: "",
      platformLogPath: "",
      providerBaseUrl: "",
      providerModel: "",
      providerApiKey: ""
    }
  });
  try {
    const denied = await app.inject({ method: "GET", url: "/zuno/status" });
    assert.equal(denied.statusCode, 403);
    const deniedWrite = await app.inject({
      method: "POST",
      url: "/zuno/diagnose",
      payload: { question: "Why 403?" }
    });
    assert.equal(deniedWrite.statusCode, 403);
    const deniedHistory = await app.inject({ method: "GET", url: "/zuno/conversations" });
    assert.equal(deniedHistory.statusCode, 403);
  } finally {
    await app.close();
  }
});
