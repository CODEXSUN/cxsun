import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Kysely } from "kysely";
import type { FrappeDatabase } from "../connection/index.js";
import { FrappeUserSyncService } from "./user-sync.service.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const database = {
  selectFrom: () => ({
    selectAll: () => ({ where: () => ({ executeTakeFirst: async () => null }) })
  })
} as unknown as Kysely<FrappeDatabase>;
const defaults = {
  baseUrl: "https://frappe.example.com/",
  apiKey: "key",
  apiSecret: "secret",
  enabled: true
};

test("previews every page and matches local users by email", async () => {
  const starts: number[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/Employee")) {
      return new Response(
        JSON.stringify({
          data: [
            { name: "EMP-001", user_id: "final@example.com", status: "Left" },
            { name: "EMP-002", user_id: "FINAL@example.com", status: "Active" }
          ]
        }),
        { status: 200 }
      );
    }
    starts.push(Number(url.searchParams.get("limit_start")));
    const first = starts.length === 1;
    return new Response(
      JSON.stringify({
        data: first
          ? Array.from({ length: 100 }, (_, index) => ({
              name: `user-${index}`,
              full_name: `User ${index}`,
              email: `user${index}@example.com`,
              enabled: 1,
              user_type: "System User"
            }))
          : [
              {
                name: "final",
                full_name: "Final User",
                email: "FINAL@example.com",
                enabled: 1,
                user_type: "System User"
              }
            ]
      }),
      { status: 200 }
    );
  };
  const service = new FrappeUserSyncService(
    {
      database,
      localUsers: async () => [{ id: 42, email: "final@example.com", status: "active" }],
      importUser: async () => ({ status: "already-exists", userId: 42, password: null })
    },
    defaults,
    "secret"
  );
  const users = await service.preview();
  assert.deepEqual(starts, [0, 100]);
  assert.equal(users.length, 101);
  assert.equal(users.at(-1)?.localUserId, 42);
  assert.equal(users.at(-1)?.employeeCode, "EMP-002");
  assert.equal(users[0]?.employeeCode, null);
});

test("rechecks the selected Frappe user before local import", async () => {
  const imports: { name: string; email: string; password?: string }[] = [];
  globalThis.fetch = async (input) =>
    new Response(
      JSON.stringify({
        data: String(input).includes("/Employee?")
          ? [{ name: "HR-EMP-00001", user_id: "selected@example.com", status: "Active" }]
          : {
              name: "selected",
              full_name: "Selected User",
              email: "selected@example.com",
              enabled: 1,
              user_type: "System User"
            }
      }),
      { status: 200 }
    );
  const service = new FrappeUserSyncService(
    {
      database,
      localUsers: async () => [],
      importUser: async (user) => {
        imports.push(user);
        return { status: "created", userId: 7, password: "temporary" };
      }
    },
    defaults,
    "secret"
  );
  assert.equal((await service.import("selected")).userId, 7);
  assert.equal((await service.import("selected", "custom-password")).userId, 7);
  assert.deepEqual(imports, [
    { name: "Selected User", email: "selected@example.com" },
    { name: "Selected User", email: "selected@example.com", password: "custom-password" }
  ]);
});
