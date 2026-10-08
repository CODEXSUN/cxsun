import assert from "node:assert/strict";
import test from "node:test";
import { decryptZetroApiKey, encryptZetroApiKey } from "./provider.secrets.js";

test("encrypts the API key and binds it to one tenant", () => {
  const ciphertext = encryptZetroApiKey("sk-test-secret", "deployment-secret", "tenant-a");
  assert.equal(ciphertext.includes("sk-test-secret"), false);
  assert.equal(decryptZetroApiKey(ciphertext, "deployment-secret", "tenant-a"), "sk-test-secret");
  assert.throws(() => decryptZetroApiKey(ciphertext, "deployment-secret", "tenant-b"));
  assert.throws(() => decryptZetroApiKey(ciphertext, "wrong-secret", "tenant-a"));
});
