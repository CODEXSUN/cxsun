import assert from "node:assert/strict";
import test from "node:test";
import { decryptAuditorPassword, encryptAuditorPassword } from "./client.secrets.js";

test("auditor passwords are encrypted and bound to their client and portal", () => {
  const encrypted = encryptAuditorPassword("private-password", "test-secret-key", 12, "gstin");

  assert.notEqual(encrypted, "private-password");
  assert.match(encrypted, /^v1\./);
  assert.equal(
    decryptAuditorPassword(encrypted, "test-secret-key", 12, "gstin"),
    "private-password"
  );
  assert.throws(() => decryptAuditorPassword(encrypted, "test-secret-key", 13, "gstin"));
  assert.throws(() => decryptAuditorPassword(encrypted, "test-secret-key", 12, "eway"));
  assert.throws(() => decryptAuditorPassword(encrypted, "wrong-key", 12, "gstin"));
  const changedTag = encrypted.split(".");
  changedTag[2] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decryptAuditorPassword(changedTag.join("."), "test-secret-key", 12, "gstin"));
});
