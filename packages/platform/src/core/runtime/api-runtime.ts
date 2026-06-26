export interface HealthResponse {
  status?: string
  version?: string
}

export function resolveApiPort(value: string | number | undefined, envKey: string, fallback: number) {
  const rawValue = value ?? fallback
  const port = Number(rawValue)

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`${envKey} must be a valid TCP port between 1 and 65535. Received: ${String(rawValue)}`)
  }

  return port
}

export function publicApiUrl(port: number) {
  return `http://localhost:${port}`
}

export function localHealthUrl(port: number) {
  return `http://127.0.0.1:${port}/health`
}

export async function waitForHealth(healthUrl: string, attempts = 10): Promise<HealthResponse> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) {
        return await response.json() as HealthResponse
      }
      lastError = new Error(`Health check returned ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 100))
  }

  throw lastError instanceof Error ? lastError : new Error('Health check failed.')
}
