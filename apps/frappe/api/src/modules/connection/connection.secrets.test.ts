import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptFrappeCredential, encryptFrappeCredential } from "./connection.secrets.js";

test("Frappe credentials are encrypted and bound to their field", () => {
  const ciphertext = encryptFrappeCredential("private-token", "deployment-secret", "secret");
  assert.equal(ciphertext.includes("private-token"), false);
  assert.equal(decryptFrappeCredential(ciphertext, "deployment-secret", "secret"), "private-token");
  assert.throws(() => decryptFrappeCredential(ciphertext, "deployment-secret", "key"));
  assert.throws(() => decryptFrappeCredential(ciphertext, "wrong-secret", "secret"));
});
