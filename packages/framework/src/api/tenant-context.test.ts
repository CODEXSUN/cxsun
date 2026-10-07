import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerHealthRoute } from "./health-route.js";
import { registerTenantContext } from "./tenant-context.js";

test("untrusted tenant headers are absent from response metadata", async () => {
  const app = Fastify();
  registerTenantContext(app);
  registerHealthRoute(app, [{ name: "api", check: () => ({ status: "ok" }) }]);
  try {
    const response = await app.inject({
      headers: { "x-tenant-id": "forged-tenant" },
      method: "GET",
      url: "/health"
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["x-tenant-id"], undefined);
    assert.equal(response.json().meta.tenantId, undefined);
  } finally {
    await app.close();
  }
});
