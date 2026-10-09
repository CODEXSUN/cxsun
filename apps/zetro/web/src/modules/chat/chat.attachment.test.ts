import assert from "node:assert/strict";
import { test } from "node:test";
import { readZetroAttachment } from "./chat.attachment";

test("previews a dropped CSV and retains its text for Zetro", async () => {
  const file = new File(["customer,amount\nACME,120\nBeta,75"], "sales.csv", {
    type: "text/csv"
  });
  const preview = await readZetroAttachment(file);
  assert.equal(preview.details, "CSV · 2 data rows");
  assert.equal(preview.attachment.name, "sales.csv");
  assert.match(preview.excerpt, /ACME,120/);
});

test("describes JSON fields and rejects unsupported files", async () => {
  const json = await readZetroAttachment(
    new File(['{"total":120,"currency":"INR"}'], "report.json")
  );
  assert.equal(json.details, "JSON · 2 top-level fields");
  await assert.rejects(
    readZetroAttachment(new File(["binary"], "report.pdf")),
    /Choose a \.txt, \.md, \.csv, or \.json file/
  );
});

test("accepts a 1 MB text file and rejects anything larger", async () => {
  const accepted = await readZetroAttachment(new File(["a".repeat(1024 * 1024)], "notes.txt"));
  assert.equal(accepted.size, 1024 * 1024);
  assert.equal(accepted.attachment.content.length, 1024 * 1024);
  await assert.rejects(
    readZetroAttachment(new File(["a".repeat(1024 * 1024 + 1)], "notes.txt")),
    /up to 1 MB/
  );
});
