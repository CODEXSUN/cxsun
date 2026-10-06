import assert from "node:assert/strict";
import test from "node:test";
import { assertSingleTenantRecords } from "./tenancy-policy.js";

const configuredTenant = {
  corporateId: "ACME",
  status: "active" as const,
  tenantCode: "ACME"
};

test("single mode accepts only its configured active tenant", () => {
  assert.doesNotThrow(() => assertSingleTenantRecords([configuredTenant], "acme", "acme"));
  assert.throws(() => assertSingleTenantRecords([], "ACME"));
  assert.throws(() =>
    assertSingleTenantRecords(
      [configuredTenant, { ...configuredTenant, corporateId: "OTHER" }],
      "ACME"
    )
  );
  assert.throws(() =>
    assertSingleTenantRecords([{ ...configuredTenant, status: "suspended" }], "ACME")
  );
  assert.throws(() => assertSingleTenantRecords([configuredTenant], "OTHER"));
});

test("single mode refuses a seed that would create another tenant", () => {
  assert.throws(() => assertSingleTenantRecords([configuredTenant], "ACME", "OTHER"));
});
