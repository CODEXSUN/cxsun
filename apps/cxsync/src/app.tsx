import { useState } from "react"
import { clearStoredSession, getStoredSession, type AuthSession } from "./features/auth/auth-client"
import { LoginPage } from "./features/auth/login-page"
import { WorkspaceShell } from "./features/workspace/workspace-shell"

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())

  if (!session) return <LoginPage onAuthenticated={setSession} />

  return (
    <WorkspaceShell
      onLogout={() => {
        clearStoredSession()
        setSession(null)
      }}
      session={session}
    />
  )
}
