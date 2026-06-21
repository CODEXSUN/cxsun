import type { LocalAdminSession } from "../../shared/connection-contracts"
import { connectionClient } from "../connections/connection-client"

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
}

export async function login(credentials: { email: string; password: string }) {
  const session = await connectionClient().authenticateLocalAdmin(credentials.email, credentials.password)
  sessionStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}
