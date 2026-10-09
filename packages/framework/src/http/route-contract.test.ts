import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { z } from "zod";
import { registerContractRoute } from "./route-contract.js";

test("uses a route-specific body limit for larger validated requests", async () => {
  const app = Fastify();
  registerContractRoute(app, {
    method: "POST",
    url: "/large-request",
    bodyLimit: 2 * 1024 * 1024,
    schemas: {
      body: z.object({ text: z.string() }).strict(),
      response: z.object({ length: z.number() })
    },
    handler: ({ body }) => ({ length: body.text.length })
  });
  const response = await app.inject({
    method: "POST",
    url: "/large-request",
    payload: { text: "a".repeat(1024 * 1024) }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.length, 1024 * 1024);
  await app.close();
});
