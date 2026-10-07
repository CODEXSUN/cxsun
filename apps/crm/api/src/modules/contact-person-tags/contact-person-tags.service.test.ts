import assert from "node:assert/strict";
import { test } from "node:test";
import { ContactPersonTagsService } from "./contact-person-tags.service.js";
import type { ContactPersonTagsRepository } from "./contact-person-tags.repository.js";

test("person tags reject inactive tags and reactivate an existing assignment", async () => {
  let activated = 0;
  const repository = {
    list: async () => [{ id: 3, personId: 8, tagId: 5, status: "inactive" }],
    setActive: async (id: number) => {
      activated = id;
      return { id };
    },
    create: async () => {
      throw new Error("Duplicate row should be reused.");
    }
  } as unknown as ContactPersonTagsRepository;
  const service = new ContactPersonTagsService(
    repository,
    async () => true,
    async (id) => id === 5
  );

  await assert.rejects(
    service.create({ personId: 8, tagId: 6 }, "actor@example.com"),
    /active tag/i
  );
  await service.create({ personId: 8, tagId: 5 }, "actor@example.com");
  assert.equal(activated, 3);
});
