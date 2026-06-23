import type { LocalAdminSession } from "../../shared/connection-contracts"
import { connectionClient, cxSyncCloudBrowserUrl } from "../connections/connection-client"

const sessionKey = "cxsync.local-admin.session"

export type AuthSession = LocalAdminSession

export function getStoredSession(): AuthSession | null {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) ?? "null") as AuthSession | null
  } catch {
    return null
  }
}

export function clearStoredSession() {
  sessionStorage.removeItem(sessionKey)
  if (!connectionClient().isDesktop) void fetch(`${cxSyncCloudBrowserUrl()}/api/v1/cxsync-cloud/admin/logout`, { credentials: "include", method: "POST" }).catch(() => undefined)
}

export async function login(credentials: { email: string; password: string }) {
  const session = connectionClient().isDesktop
    ? await connectionClient().authenticateLocalAdmin(credentials.email, credentials.password)
    : await loginCloudAdmin(credentials)
  sessionStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}

export async function validateStoredSession() {
  const stored = getStoredSession()
  if (!stored || connectionClient().isDesktop) return stored
  const response = await fetch(`${cxSyncCloudBrowserUrl()}/api/v1/cxsync-cloud/admin/session`, { credentials: "include" })
  if (!response.ok) {
    sessionStorage.removeItem(sessionKey)
    return null
  }
  const session = await response.json() as AuthSession
  sessionStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}

async function loginCloudAdmin(credentials: { email: string; password: string }): Promise<AuthSession> {
  const response = await fetch(`${cxSyncCloudBrowserUrl()}/api/v1/cxsync-cloud/admin/login`, {
    body: JSON.stringify(credentials),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  const body = await response.json().catch(() => null) as (AuthSession & { error?: string }) | null
  if (!response.ok || !body?.email) throw new Error(body?.error || `CXSync Cloud login returned HTTP ${response.status}.`)
  return { email: body.email, name: body.name, role: body.role }
}
