import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Kysely } from "kysely";
import { FrappeConnectionService } from "./connection.service.js";
import type { FrappeDatabase } from "./connection.types.js";

const originalFetch = globalThis.fetch;
const emptyDatabase = {
  selectFrom: () => ({
    selectAll: () => ({ where: () => ({ executeTakeFirst: async () => undefined }) })
  })
} as unknown as Kysely<FrappeDatabase>;
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
    emptyDatabase,
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
  assert.deepEqual(await service.verify(), {
    connected: true,
    user: "sync@example.com",
    saved: false
  });
});

test("disabled sync does not contact Frappe", async () => {
  globalThis.fetch = async () => {
    throw new Error("unexpected network request");
  };
  const service = new FrappeConnectionService(
    emptyDatabase,
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

test("a different verification URL requires new credentials", async () => {
  globalThis.fetch = async () => {
    throw new Error("unexpected network request");
  };
  const service = new FrappeConnectionService(
    emptyDatabase,
    { baseUrl: "https://frappe.example", apiKey: "key", apiSecret: "secret", enabled: true },
    async () => {
      throw new Error("not used");
    },
    { actorEmail: "test@example.com", actorUserId: 1, canViewAll: false }
  );
  await assert.rejects(
    () => service.verify({ baseUrl: "https://different.example", enabled: true }),
    /both API credentials/
  );
});

test("first outbound enquiry post uses the mapped employee code", async () => {
  const database = {
    selectFrom: () => ({
      selectAll: () => ({ where: () => ({ executeTakeFirst: async () => null }) }),
      select: () => ({ where: () => ({ executeTakeFirst: async () => null }) })
    }),
    insertInto: () => ({
      values: () => ({ onDuplicateKeyUpdate: () => ({ execute: async () => undefined }) })
    })
  } as unknown as Kysely<FrappeDatabase>;
  let posted: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ data: { name: "ENQ-1" } });
  };
  const service = new FrappeConnectionService(
    database,
    { baseUrl: "https://frappe.example", apiKey: "key", apiSecret: "secret", enabled: true },
    async () =>
      ({
        title: "Test enquiry",
        description: "Details",
        capturedPhone: "",
        enquiredAt: "2026-10-08T00:00:00.000Z",
        dueDate: null,
        priorityName: "Medium",
        statusName: "Open",
        createdBy: "local@example.com"
      }) as never,
    { actorEmail: "local@example.com", actorUserId: 1, canViewAll: false },
    "",
    async (email, baseUrl) => {
      assert.equal(email, "local@example.com");
      assert.equal(baseUrl, "https://frappe.example");
      return "HR-EMP-00042";
    }
  );
  await service.sync(1);
  assert.equal(posted.user_employee, "HR-EMP-00042");
});
