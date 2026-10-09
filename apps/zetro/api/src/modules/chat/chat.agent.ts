import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppError } from "@cxsun/framework/errors";

export function loadZetroAgentRules() {
  const paths = [
    resolve(import.meta.dirname, "../../../../agent/skills.md"),
    resolve(import.meta.dirname, "../../../agent/skills.md")
  ];
  for (const path of paths) {
    try {
      const text = readFileSync(path, "utf8").trim();
      if (!text) break;
      return { text, hash: createHash("sha256").update(text).digest("hex") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") break;
    }
  }
  throw AppError.internal("Zetro business rules are unavailable.");
}
