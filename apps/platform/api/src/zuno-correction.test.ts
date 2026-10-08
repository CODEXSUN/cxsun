import assert from "node:assert/strict";
import test from "node:test";
import { validateZunoTextCorrectionPlan } from "./zuno-correction-policy.js";

const correction = {
  table: "billing_customers",
  column: "display_name",
  rowId: 42,
  expectedValue: "Misspelled customer",
  replacementValue: "Correct customer"
};

test("Zuno accepts a targeted text correction", () => {
  assert.doesNotThrow(() => validateZunoTextCorrectionPlan(correction));
});

test("Zuno rejects internal, identity, and broad correction targets", () => {
  for (const plan of [
    { ...correction, table: "tenant_users" },
    { ...correction, column: "password_hash" },
    { ...correction, column: "status" },
    { ...correction, rowId: 0 },
    { ...correction, expectedValue: correction.replacementValue }
  ]) {
    assert.throws(() => validateZunoTextCorrectionPlan(plan));
  }
});
