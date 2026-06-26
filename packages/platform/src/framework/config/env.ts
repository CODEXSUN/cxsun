import { existsSync, readFileSync } from 'fs'
import { dirname, parse, resolve } from 'path'

type EnvValue = string | undefined

const envFile = readEnvFile(findEnvFile(process.cwd()) ?? resolve(process.cwd(), '.env'))
const runtimeEnv = { ...envFile, ...process.env }

export function envString(key: string, fallback = '') {
  const value = normalizeValue(runtimeEnv[key])
  return value === undefined || value === '' ? fallback : value
}

export function envOptionalString(key: string) {
  const value = normalizeValue(runtimeEnv[key])
  return value === '' ? undefined : value
}

export function envNumber(key: string, fallback: number) {
  const value = envOptionalString(key)
  if (value === undefined) return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid number. Received: ${value}`)
  }

  return parsed
}

export function envSecret(secretRef: string, fallbackKey?: string) {
  return envOptionalString(secretRef) ?? (fallbackKey ? envOptionalString(fallbackKey) : undefined)
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}

  const values: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)
    if (!match) continue

    const [, rawKey, rawValue] = match
    const key = rawKey.trim()
    if (!key) continue

    values[key] = parseEnvValue(rawValue)
  }

  return values
}

function findEnvFile(start: string) {
  let current = resolve(start)
  const root = parse(current).root
  for (let index = 0; index < 8; index += 1) {
    const candidate = resolve(current, '.env')
    if (existsSync(candidate)) return candidate
    if (current === root) break
    current = dirname(current)
  }
  return null
}

function parseEnvValue(rawValue: string) {
  const trimmed = rawValue.trim()
  if (!trimmed) return ''

  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

function normalizeValue(value: EnvValue) {
  return typeof value === 'string' ? parseEnvValue(value) : undefined
}
