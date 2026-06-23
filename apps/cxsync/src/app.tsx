import { useEffect, useState } from "react"
import { clearStoredSession, getStoredSession, validateStoredSession, type AuthSession } from "./features/auth/auth-client"
import { LoginPage } from "./features/auth/login-page"
import { WorkspaceShell } from "./features/workspace/workspace-shell"

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())

  useEffect(() => {
    if (!session) return
    void validateStoredSession().then((current) => setSession(current)).catch(() => {
      clearStoredSession()
      setSession(null)
    })
  }, [])

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
