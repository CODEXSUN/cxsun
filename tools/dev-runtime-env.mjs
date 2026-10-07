import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadDevEnv(root) {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])])
  );
}

export function requiredDevPort(value, envKey) {
  const raw = String(value ?? "").trim();
  const port = Number(raw);
  if (!raw || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid or missing port configuration for ${envKey}: ${raw || "<empty>"}`);
  }
  return port;
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/u, "").trim();
}
