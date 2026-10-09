import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareZetroAttachment } from "./chat.attachment.js";

test("scans a large file and retains relevant excerpts without saving the full source", () => {
  const content = [
    "Opening notes",
    ...Array.from({ length: 14_000 }, (_, index) => `Routine row ${index}`),
    "ACME order 9001 is awaiting review",
    "Closing notes"
  ].join("\n");
  const prepared = prepareZetroAttachment({ name: "orders.txt", content }, "Find ACME order 9001");
  assert.equal(prepared.coverage, "full-file chunk summaries");
  assert.match(prepared.recordedPrompt, /ACME order 9001 is awaiting review/);
  assert.match(prepared.recordedPrompt, /SHA-256 [0-9a-f]{64}/u);
  assert.doesNotMatch(prepared.recordedPrompt, /Routine row 7000/);
  assert.ok(prepared.recordedPrompt.length < 15_000);
});
