export class ApiError extends Error {
  readonly code?: string
  readonly details: Record<string, unknown>
  readonly reason?: string
  readonly source?: string
  readonly status?: number
  readonly title?: string

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = "ApiError"
    this.details = details
    this.cause = details
    this.code = optionalString(details.code)
    this.reason = optionalString(details.reason) ?? optionalString(details.lockReason)
    this.source = optionalString(details.source) ?? optionalString(details.lockSource)
    this.status = typeof details.statusCode === "number" ? details.statusCode : typeof details.status === "number" ? details.status : undefined
    this.title = optionalString(details.title)
  }
}

export async function responseApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json() as Record<string, unknown>
    const message = optionalString(payload.error) ?? optionalString(payload.message) ?? `${fallback} Status ${response.status}.`
    return new ApiError(message, { ...payload, status: response.status, statusCode: response.status })
  } catch {
    return new ApiError(`${fallback} Status ${response.status}.`, { status: response.status, statusCode: response.status })
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined
}
