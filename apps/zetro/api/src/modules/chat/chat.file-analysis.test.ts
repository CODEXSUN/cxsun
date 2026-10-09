import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeZetroFile } from "./chat.file-analysis.js";

test("analyzes every part of a large file in order", async () => {
  const content = `${"a".repeat(40_000)}\n${"b".repeat(40_000)}\n${"c".repeat(40_000)}`;
  const analyzed: string[] = [];
  const summary = await summarizeZetroFile(
    content,
    "Summarize the file",
    "Business rules",
    async (messages) => {
      const part = messages[1]?.content ?? "";
      analyzed.push(part);
      return part.includes("File part 1")
        ? "First section"
        : part.includes("File part 2")
          ? "Second section"
          : "Third section";
    }
  );
  assert.equal(analyzed.length, 3);
  assert.match(analyzed.join(""), /c{100}/u);
  assert.match(summary, /^Part 1: First section/u);
  assert.match(summary, /Part 2: Second section/u);
  assert.match(summary, /Part 3: Third section/u);
});
