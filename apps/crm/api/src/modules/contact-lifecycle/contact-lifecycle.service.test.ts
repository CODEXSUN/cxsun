import assert from "node:assert/strict";
import { test } from "node:test";
import { ContactLifecycleService } from "./contact-lifecycle.service.js";
import type { ContactLifecycleRepository } from "./contact-lifecycle.repository.js";
import type { ContactLifecycleInput } from "./contact-lifecycle.types.js";

test("lifecycle appends the next status using server-owned previous status", async () => {
  let saved: ContactLifecycleInput | undefined;
  const repository = {
    list: async () => [{ newStatus: "Prospect" }],
    create: async (input: ContactLifecycleInput) => { saved = input; return input; },
    get: async () => ({ id: 3 })
  } as unknown as ContactLifecycleRepository;
  const service = new ContactLifecycleService(repository, async () => true);
  await service.create({ personId: 7, previousStatus: "Forged", newStatus: "Active", reason: null, effectiveAt: null }, "actor@example.com");
  assert.equal(saved?.previousStatus, "Prospect");
  assert.match(saved?.effectiveAt ?? "", /^\d{4}-\d{2}-\d{2}$/u);
  await assert.rejects(service.update(3, saved!, "actor@example.com"), /cannot be edited/i);
});
