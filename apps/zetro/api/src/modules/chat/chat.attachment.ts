import { createHash } from "node:crypto";
import { AppError } from "@cxsun/framework/errors";

type TextAttachment = { name: string; content: string };

const DIRECT_TEXT_LIMIT = 6500;
const EXCERPT_LIMIT = 240;
const COMMON_WORDS = new Set([
  "about",
  "attached",
  "business",
  "details",
  "file",
  "from",
  "give",
  "information",
  "please",
  "report",
  "show",
  "summarize",
  "summary",
  "tell",
  "this",
  "what",
  "with"
]);

export function prepareZetroAttachment(attachment: TextAttachment, question: string) {
  const content = attachment.content.replace(/\r\n?/gu, "\n");
  const bytes = Buffer.byteLength(content, "utf8");
  const digest = createHash("sha256").update(content).digest("hex");
  const extension = attachment.name.split(".").at(-1)?.toLowerCase();
  const source = extension === "json" ? prettyJson(content) : content;
  const lines = source.split("\n");
  const details = [`${bytes.toLocaleString("en-US")} bytes`, `${lines.length} text lines`];
  if (extension === "csv") {
    const records = countCsvRecords(content);
    details.push(`${Math.max(0, records - 1)} CSV data records`);
    details.push(`header: ${lines[0]?.slice(0, 320) ?? ""}`);
  } else if (extension === "json") {
    const parsed = JSON.parse(content) as unknown;
    details.push(
      Array.isArray(parsed)
        ? `${parsed.length} top-level items`
        : parsed !== null && typeof parsed === "object"
          ? `keys: ${Object.keys(parsed).slice(0, 20).join(", ")}`
          : "single JSON value"
    );
  } else if (extension === "md") {
    const headings = lines.filter((line) => /^#{1,6} /u.test(line)).slice(0, 12);
    if (headings.length) details.push(`headings: ${headings.join(" | ").slice(0, 600)}`);
  }

  const overview = `[User-provided file: ${attachment.name}; ${details.join("; ")}; SHA-256 ${digest}]`;
  if (content.length <= DIRECT_TEXT_LIMIT) {
    return {
      recordedPrompt: `${question}\n\n${overview}\n${content}`,
      coverage: "full text" as const
    };
  }

  const excerpts = selectExcerpts(lines, question);
  return {
    recordedPrompt: `${question}\n\n${overview}\n[Selected excerpts from a full-file scan; omitted text is not available to the model]\n${excerpts}`,
    coverage: "full-file chunk summaries" as const
  };
}

function prettyJson(content: string) {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    throw AppError.validation("The attached JSON file is invalid.");
  }
}

function selectExcerpts(lines: string[], question: string) {
  const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])]
    .filter((word) => !COMMON_WORDS.has(word))
    .slice(0, 12);
  const selected = new Set<number>();
  for (let index = 0; index < Math.min(8, lines.length); index += 1) selected.add(index);
  for (let index = Math.max(0, lines.length - 4); index < lines.length; index += 1)
    selected.add(index);
  if (words.length) {
    const matches = lines
      .map((line, index) => ({
        index,
        score: words.reduce((score, word) => score + Number(line.toLowerCase().includes(word)), 0)
      }))
      .filter((row) => row.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 24);
    for (const match of matches) selected.add(match.index);
  }
  return [...selected]
    .sort((left, right) => left - right)
    .map((index) => `Line ${index + 1}: ${lines[index]?.slice(0, EXCERPT_LIMIT) ?? ""}`)
    .join("\n");
}

function countCsvRecords(content: string) {
  let records = 0;
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (character === "\n" && !quoted) {
      records += 1;
    }
  }
  return records + Number(!content.endsWith("\n"));
}
