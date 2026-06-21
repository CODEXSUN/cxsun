const API_ROOT = "/api/v1/tirupur-connect"
const TOKEN_KEY = "tirupur-connect-member-token"
const LOADER_EVENT = "tirupur-connect:loader"

export type MarketplaceSession = {
  token: string
  identity: {
    accountId: number
    accountUuid: string
    email: string
    role: string
    companyId: number | null
  }
}

export function storedSession(): MarketplaceSession | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const identity = localStorage.getItem(`${TOKEN_KEY}:identity`)
  if (!token || !identity) return null
  try {
    return { token, identity: JSON.parse(identity) as MarketplaceSession["identity"] }
  } catch {
    return null
  }
}

export function saveSession(session: MarketplaceSession | null) {
  if (!session) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(`${TOKEN_KEY}:identity`)
    return
  }
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(`${TOKEN_KEY}:identity`, JSON.stringify(session.identity))
}

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`${API_ROOT}/public${path}`, init)
}

export async function memberApi<T>(path: string, session: MarketplaceSession, init?: RequestInit): Promise<T> {
  return request<T>(`${API_ROOT}/member${path}`, {
    ...init,
    headers: { ...jsonHeaders(init?.headers), Authorization: `Bearer ${session.token}` },
  })
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  window.dispatchEvent(new CustomEvent(LOADER_EVENT, { detail: 1 }))
  try {
    const response = await fetch(url, {
      ...init,
      headers: jsonHeaders(init?.headers),
    })
    const payload = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}.`)
    return payload as T
  } finally {
    window.dispatchEvent(new CustomEvent(LOADER_EVENT, { detail: -1 }))
  }
}

function jsonHeaders(headers?: HeadersInit) {
  return { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers).entries()) }
}
