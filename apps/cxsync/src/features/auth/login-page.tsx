import { useState, type FormEvent } from "react"
import { LoaderCircle, LockKeyhole } from "lucide-react"
import { login, type AuthSession } from "./auth-client"

export function LoginPage({ onAuthenticated }: { onAuthenticated(session: AuthSession): void }) {
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const data = new FormData(event.currentTarget)
    try {
      onAuthenticated(await login({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page login-page--private">
      <section className="login-story">
        <div className="cxsync-logo cxsync-logo--light"><span>CX</span><strong>Sync</strong></div>
        <h1>CXSync Admin</h1>
        <p>Local tenant connection manager.</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <span className="login-icon"><LockKeyhole size={23} /></span>
        <h2>Sign in</h2>
        <label><span>Email</span><input autoComplete="email" autoFocus name="email" required type="email" /></label>
        <label><span>Password</span><input autoComplete="current-password" name="password" required type="password" /></label>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        <button className="primary-button login-submit" disabled={submitting} type="submit">
          {submitting ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />}
          Sign in
        </button>
      </form>
    </main>
  )
}
