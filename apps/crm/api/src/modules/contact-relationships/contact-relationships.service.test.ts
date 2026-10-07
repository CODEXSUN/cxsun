import assert from "node:assert/strict";
import { test } from "node:test";
import { ContactRelationshipsService } from "./contact-relationships.service.js";
import type { ContactRelationshipsRepository } from "./contact-relationships.repository.js";

const input = {
  customerContactId: 10,
  personAId: 21,
  personBId: 22,
  relationshipType: "Manager",
  relationshipStrength: null,
  notes: null
};

test("relationships require two people from the selected customer", async () => {
  let writes = 0;
  const repository = {
    create: async () => {
      writes += 1;
      return input;
    }
  } as unknown as ContactRelationshipsRepository;
  const service = new ContactRelationshipsService(
    repository,
    async () => true,
    async (id) => (id === 21 ? 10 : 11)
  );

  await assert.rejects(service.create(input, "actor@example.com"), /selected customer/i);
  await assert.rejects(
    service.create({ ...input, personBId: 21 }, "actor@example.com"),
    /two different/i
  );
  assert.equal(writes, 0);
});
