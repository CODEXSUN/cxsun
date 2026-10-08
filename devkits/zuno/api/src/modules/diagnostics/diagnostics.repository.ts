import { open, readFile, readdir, realpath, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import type { ZunoConfig, ZunoEvidence, ZunoStatus } from "./diagnostics.types.js";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "dist",
  "node_modules",
  "coverage",
  ".turbo",
  "build"
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".mjs"]);

export class DiagnosticsRepository {
  constructor(private readonly config: ZunoConfig) {}

  async status(): Promise<ZunoStatus> {
    const [sourceReady, logReady] = await Promise.all([
      this.config.sourceRoot
        ? stat(this.config.sourceRoot)
            .then((value) => value.isDirectory())
            .catch(() => false)
        : false,
      this.config.platformLogPath
        ? stat(this.config.platformLogPath)
            .then((value) => value.isFile())
            .catch(() => false)
        : false
    ]);
    return {
      sourceReady,
      logReady,
      modelReady: Boolean(
        this.config.providerBaseUrl && this.config.providerModel && this.config.providerApiKey
      )
    };
  }

  async searchCode(term: string): Promise<ZunoEvidence[]> {
    if (!this.config.sourceRoot || term.length < 3 || term.length > 100) return [];
    const root = await realpath(this.config.sourceRoot).catch(() => "");
    if (!root) return [];
    const results: ZunoEvidence[] = [];
    const pending = [root];
    let examined = 0;
    while (pending.length && examined < 3000 && results.length < 8) {
      const directory = pending.pop()!;
      const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (examined >= 3000 || results.length >= 8) break;
        if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          pending.push(path);
          continue;
        }
        if (!entry.isFile() || !sourceExtensions.has(extname(entry.name))) continue;
        examined += 1;
        const info = await stat(path).catch(() => null);
        if (!info || info.size > 64_000) continue;
        const content = await readFile(path, "utf8").catch(() => "");
        const lines = content.split("\n");
        for (let index = 0; index < lines.length && results.length < 8; index += 1) {
          if (lines[index]?.toLowerCase().includes(term.toLowerCase())) {
            results.push({
              source: `${relative(root, path)}:${index + 1}`,
              content: redact(lines.slice(Math.max(0, index - 2), index + 3).join("\n")).slice(
                0,
                1200
              )
            });
          }
        }
      }
    }
    return results;
  }

  async readCode(path: string): Promise<ZunoEvidence | null> {
    if (!this.config.sourceRoot || !path || path.includes("\\") || path.startsWith("."))
      return null;
    const root = await realpath(this.config.sourceRoot).catch(() => "");
    if (!root) return null;
    const absolute = await realpath(resolve(root, path)).catch(() => "");
    if (!absolute || !absolute.startsWith(`${root}${sep}`)) return null;
    if (absolute.split(sep).some((part) => part.startsWith(".") || ignoredDirectories.has(part)))
      return null;
    if (!sourceExtensions.has(extname(absolute))) return null;
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile() || info.size > 32_000) return null;
    return { source: relative(root, absolute), content: redact(await readFile(absolute, "utf8")) };
  }

  async tailPlatformLog(): Promise<ZunoEvidence | null> {
    if (!this.config.platformLogPath) return null;
    const handle = await open(this.config.platformLogPath, "r").catch(() => null);
    if (!handle) return null;
    try {
      const info = await handle.stat();
      if (!info.isFile()) return null;
      const length = Math.min(info.size, 24_000);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, info.size - length);
      const lines = buffer.toString("utf8").split("\n");
      return { source: "Platform API log (recent)", content: redact(lines.slice(-100).join("\n")) };
    } finally {
      await handle.close();
    }
  }
}

function redact(value: string) {
  return value
    .replace(/(bearer\s+)[^\s"']+/giu, "$1[REDACTED]")
    .replace(
      /(["']?(?:api[_-]?key|password|secret|token|authorization)["']?\s*[:=]\s*["']?)[^\s,"'}]+/giu,
      "$1[REDACTED]"
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, "[REDACTED]");
}
