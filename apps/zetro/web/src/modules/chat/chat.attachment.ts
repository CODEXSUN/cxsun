export type ZetroTextAttachment = {
  name: string;
  content: string;
};

export type ZetroAttachmentPreview = {
  attachment: ZetroTextAttachment;
  details: string;
  excerpt: string;
  size: number;
};

export const MAX_FILE_BYTES = 1024 * 1024;
const SUPPORTED_EXTENSION = /\.(txt|md|csv|json)$/iu;

export async function readZetroAttachment(file: File): Promise<ZetroAttachmentPreview> {
  const extension = file.name.match(SUPPORTED_EXTENSION)?.[1]?.toLowerCase();
  if (!extension) throw new Error("Choose a .txt, .md, .csv, or .json file.");
  if (file.name.length > 160) throw new Error("This file name is too long.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file up to 1 MB.");

  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true })
      .decode(await file.arrayBuffer())
      .replace(/^\uFEFF/u, "")
      .trim();
  } catch {
    throw new Error("This file is not valid UTF-8 text.");
  }
  if (!content) throw new Error("This file is empty.");
  if (content.includes("\0")) throw new Error("This file is not readable text.");

  let details: string;
  if (extension === "json") {
    let value: unknown;
    try {
      value = JSON.parse(content);
    } catch {
      throw new Error("This JSON file is not valid.");
    }
    details = Array.isArray(value)
      ? `JSON · ${value.length} items`
      : value !== null && typeof value === "object"
        ? `JSON · ${Object.keys(value).length} top-level fields`
        : "JSON · single value";
  } else {
    const lines = content.split(/\r?\n/u).filter((line) => line.trim());
    details =
      extension === "csv"
        ? `CSV · ${Math.max(0, lines.length - 1)} data rows`
        : `${extension.toUpperCase()} · ${lines.length} lines`;
  }

  return {
    attachment: { name: file.name, content },
    details,
    excerpt: content.slice(0, 240),
    size: file.size
  };
}
