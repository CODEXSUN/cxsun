import assert from "node:assert/strict";
import test from "node:test";
import { createApiApp } from "@cxsun/framework/api";
import { resolvePlatformApiUrl } from "./api-url.js";

test("the app API prefix reaches resource routes with path and query intact", async () => {
  const app = await createApiApp({
    appName: "API route test",
    cookieSecret: "test-secret",
    corsOrigins: [],
    environment: "test",
    rewriteUrl: resolvePlatformApiUrl
  });
  app.get("/billing/quotations/:id", async (request) => ({
    query: request.query,
    url: request.url
  }));

  try {
    const response = await app.inject({ url: "/api/app/billing/quotations/1?draft=1" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      query: { draft: "1" },
      url: "/billing/quotations/1?draft=1"
    });
    assert.equal(resolvePlatformApiUrl("/api/application/other"), "/api/application/other");
  } finally {
    await app.close();
  }
});
