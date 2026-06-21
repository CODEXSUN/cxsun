import { app } from "electron"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type Environment = Record<string, string>

let cached: Environment | null = null

export async function loadCxSyncEnvironment(): Promise<Environment> {
  if (cached) return cached

  const compiledRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const candidates = [
    process.env.CXSYNC_ENV_PATH,
    resolve(process.cwd(), ".env"),
    resolve(compiledRoot, "../../../../.env"),
    resolve(app.getAppPath(), "../../.env"),
    resolve(process.resourcesPath, ".env"),
  ].filter((value): value is string => Boolean(value))

  for (const path of candidates) {
    try {
      cached = { ...parseEnvironment(await readFile(path, "utf8")), ...process.env } as Environment
      return cached
    } catch {
      // Try the next supported environment location.
    }
  }

  cached = process.env as Environment
  return cached
}

function parseEnvironment(source: string) {
  const values: Environment = {}
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2")
    values[match[1]] = value
  }
  return values
}
