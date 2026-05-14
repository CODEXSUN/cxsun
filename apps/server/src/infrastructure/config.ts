export interface ServerConfig {
  host: string
  port: number
  logLevel: string
  gracePeriodMs: number
  version: string
}

const env = (key: string, fallback: string): string =>
  process.env[key] ?? fallback

const numberEnv = (key: string, fallback: number): number => {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function loadConfig(): ServerConfig {
  return {
    host: env('HOST', '0.0.0.0'),
    port: numberEnv('PORT', 6001),
    logLevel: env('LOG_LEVEL', 'info'),
    gracePeriodMs: numberEnv('GRACE_PERIOD_MS', 5_000),
    version: env('npm_package_version', '0.0.0'),
  }
}
