const TOKEN_KEY = "tirupur-connect-admin-token"
export const ADMIN_LOADING_EVENT = "tirupur-connect-admin:loading"
let pendingRequests = 0

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function platformLogin(email: string, password: string) {
  return request<{ ok: boolean; token: string }>("/api/v1/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password, surface: "super-admin" }),
  })
}

export async function adminApi<T>(path: string, init?: RequestInit) {
  return request<T>(`/api/v1/tirupur-connect/admin${path}`, getToken(), init)
}

async function request<T>(url: string, token?: string | null, init?: RequestInit): Promise<T> {
  setRequestPending(1)
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    })
    const payload = await response.json().catch(() => ({})) as { error?: string; ok?: boolean }
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed with status ${response.status}.`)
    return payload as T
  } finally {
    setRequestPending(-1)
  }
}

function setRequestPending(change: 1 | -1) {
  pendingRequests = Math.max(0, pendingRequests + change)
  window.dispatchEvent(new CustomEvent(ADMIN_LOADING_EVENT, {
    detail: { active: pendingRequests > 0, pending: pendingRequests },
  }))
}
