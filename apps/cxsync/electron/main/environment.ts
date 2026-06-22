import { app } from "electron"
import { randomBytes } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, parse, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { CxSyncGeneratedServiceKey, CxSyncServiceKeyStatus } from "../../src/shared/connection-contracts.js"

type Environment = Record<string, string>

let cached: Environment | null = null

export async function loadCxSyncEnvironment(): Promise<Environment> {
  if (cached) return cached

  const compiledRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const candidates = uniquePaths([
    process.env.CXSYNC_ENV_PATH,
    ...envCandidatesFrom(process.cwd()),
    ...envCandidatesFrom(compiledRoot),
    ...envCandidatesFrom(app.getAppPath()),
    resolve(process.resourcesPath, ".env"),
  ].filter((value): value is string => Boolean(value)))

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

export async function getServiceKeyStatus(): Promise<CxSyncServiceKeyStatus> {
  const env = await loadCxSyncEnvironment()
  return {
    cloudServiceUrl: cloudServiceUrl(env),
    envPath: await writableEnvironmentPath(),
    hasKey: Boolean(env.CXSYNC_SERVICE_KEY?.trim()),
    keyPreview: previewKey(env.CXSYNC_SERVICE_KEY),
    updatedAt: null,
  }
}

export async function generateServiceKey(): Promise<CxSyncGeneratedServiceKey> {
  const key = randomBytes(32).toString("base64url")
  const status = await saveServiceKey(key)
  return { ...status, key }
}

export async function saveServiceKey(key: string): Promise<CxSyncServiceKeyStatus> {
  const normalized = key.trim()
  if (!/^[a-zA-Z0-9_-]{32,160}$/.test(normalized)) {
    throw new Error("CXSync service key must be 32-160 URL-safe characters.")
  }
  const path = await writableEnvironmentPath()
  let source = ""
  try {
    source = await readFile(path, "utf8")
  } catch {
    await mkdir(dirname(path), { recursive: true })
  }
  const next = upsertEnvironmentValue(source, "CXSYNC_SERVICE_KEY", normalized)
  await writeFile(path, next, "utf8")
  cached = { ...parseEnvironment(next), ...process.env, CXSYNC_SERVICE_KEY: normalized }
  return {
    cloudServiceUrl: cloudServiceUrl(cached),
    envPath: path,
    hasKey: true,
    keyPreview: previewKey(normalized),
    updatedAt: new Date().toISOString(),
  }
}

export async function saveCloudServiceUrl(url: string): Promise<CxSyncServiceKeyStatus> {
  const normalized = normalizeCloudServiceUrl(url)
  const path = await writableEnvironmentPath()
  let source = ""
  try {
    source = await readFile(path, "utf8")
  } catch {
    await mkdir(dirname(path), { recursive: true })
  }
  const next = upsertEnvironmentValue(source, "CXSYNC_CLOUD_PUBLIC_URL", normalized)
  await writeFile(path, next, "utf8")
  cached = { ...parseEnvironment(next), ...process.env, CXSYNC_CLOUD_PUBLIC_URL: normalized }
  return getServiceKeyStatus()
}

async function writableEnvironmentPath() {
  if (process.env.CXSYNC_ENV_PATH?.trim()) return process.env.CXSYNC_ENV_PATH.trim()
  const candidates = uniquePaths([
    ...envCandidatesFrom(process.cwd()),
    ...envCandidatesFrom(resolve(dirname(fileURLToPath(import.meta.url)), "..")),
    ...envCandidatesFrom(app.getAppPath()),
  ])
  for (const path of candidates) {
    try {
      const source = await readFile(path, "utf8")
      if (/^CXSYNC_/m.test(source) || /^DB_HOST=/m.test(source)) return path
    } catch {
      // Try next candidate.
    }
  }
  return candidates[0] || resolve(process.cwd(), ".env")
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

function upsertEnvironmentValue(source: string, key: string, value: string) {
  const escaped = `${key}=${value}`
  const lines = source ? source.split(/\r?\n/) : []
  let replaced = false
  const next = lines.map((line) => {
    if (line.match(new RegExp(`^\\s*${key}\\s*=`))) {
      replaced = true
      return escaped
    }
    return line
  })
  if (!replaced) {
    if (next.length && next[next.length - 1] !== "") next.push("")
    next.push(escaped)
  }
  return `${next.join("\n").replace(/\n*$/, "")}\n`
}

function cloudServiceUrl(env: Environment) {
  return (env.CXSYNC_CLOUD_PUBLIC_URL || "").trim().replace(/\/+$/, "")
}

function normalizeCloudServiceUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  if (!normalized) throw new Error("Cloud service URL is required.")
  const parsed = new URL(normalized)
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Cloud service URL must start with http:// or https://.")
  return parsed.toString().replace(/\/+$/, "")
}

function envCandidatesFrom(start: string) {
  const paths: string[] = []
  let current = resolve(start)
  const root = parse(current).root
  for (let index = 0; index < 8; index += 1) {
    paths.push(resolve(current, ".env"))
    if (current === root) break
    current = dirname(current)
  }
  return paths
}

function uniquePaths(paths: string[]) {
  return [...new Set(paths.filter(Boolean))]
}

function previewKey(value?: string) {
  const key = value?.trim()
  if (!key) return null
  return `${key.slice(0, 6)}…${key.slice(-6)}`
}
