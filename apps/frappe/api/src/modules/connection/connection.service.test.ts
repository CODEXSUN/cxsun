import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Kysely } from "kysely";
import { FrappeConnectionService } from "./connection.service.js";
import type { FrappeDatabase } from "./connection.types.js";

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

test("handshake uses TechMedia compatible token authentication", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://frappe.example/api/method/frappe.auth.get_logged_user");
    assert.equal(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
      "token key:secret"
    );
    assert.equal(init?.redirect, "error");
    return Response.json({ message: "sync@example.com" });
  };
  const service = new FrappeConnectionService(
    {} as Kysely<FrappeDatabase>,
    {
      baseUrl: "https://frappe.example",
      apiKey: "key",
      apiSecret: "secret",
      enabled: true
    },
    async () => {
      throw new Error("not used");
    },
    { actorEmail: "test@example.com", actorUserId: 1, canViewAll: false }
  );
  assert.deepEqual(await service.verify(), { connected: true, user: "sync@example.com" });
});

test("disabled sync does not contact Frappe", async () => {
  globalThis.fetch = async () => {
    throw new Error("unexpected network request");
  };
  const service = new FrappeConnectionService(
    {} as Kysely<FrappeDatabase>,
    {
      baseUrl: "https://frappe.example",
      apiKey: "key",
      apiSecret: "secret",
      enabled: false
    },
    async () => {
      throw new Error("not used");
    },
    { actorEmail: "test@example.com", actorUserId: 1, canViewAll: false }
  );
  await assert.rejects(() => service.verify(), /disabled/);
});
