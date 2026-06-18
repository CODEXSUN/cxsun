import { StrictMode, useEffect, useMemo, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"

export type ProductAppConfig = {
  appKey: string
  appRoute: string
  audience: string
  capabilities: string[]
  description: string
  domains: string[]
  mainAppRoute?: string
  port: number
  title: string
  transactionLinks: string[]
}

type HealthState = {
  message: string
  ok: boolean
}

export function createProductApp(config: ProductAppConfig) {
  const root = document.getElementById("root")
  if (!root) throw new Error("App root element not found.")
  createRoot(root).render(
    <StrictMode>
      <ProductApp config={config} />
    </StrictMode>,
  )
}

function ProductApp({ config }: { config: ProductAppConfig }) {
  const [health, setHealth] = useState<HealthState>({ message: "Checking core API", ok: false })
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), [])
  const mainAppDirectoryUrl = useMemo(() => resolveMainAppUrl("/sa/app-runtime"), [])
  const mainAppUrl = useMemo(() => resolveMainAppUrl(config.mainAppRoute ?? "/sa/app-runtime"), [config.mainAppRoute])

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBaseUrl}/health`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Core API returned ${response.status}`)
        return response.json() as Promise<{ status?: string }>
      })
      .then((payload) => {
        if (!cancelled) setHealth({ message: payload.status ? `Core API ${payload.status}` : "Core API connected", ok: true })
      })
      .catch((error: unknown) => {
        if (!cancelled) setHealth({ message: error instanceof Error ? error.message : "Core API unavailable", ok: false })
      })
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  return (
    <main className="product-shell">
      <header className="product-shell__topbar">
        <div>
          <p className="product-shell__eyebrow">Codexsun product app</p>
          <h1>{config.title}</h1>
        </div>
        <StatusPill ok={health.ok}>{health.message}</StatusPill>
      </header>

      <section className="product-shell__hero">
        <div>
          <p className="product-shell__route">{config.appRoute}</p>
          <h2>{config.description}</h2>
          <p>{config.audience}</p>
          <div className="product-shell__actions" aria-label={`${config.title} app links`}>
            <a className="product-shell__button product-shell__button--primary" href={mainAppUrl}>Open main app</a>
            <a className="product-shell__button" href={mainAppDirectoryUrl}>All apps</a>
          </div>
        </div>
        <div className="product-shell__meta">
          <span>Dev port</span>
          <strong>{config.port}</strong>
        </div>
      </section>

      <section className="product-shell__grid">
        <InfoPanel title="Domains">
          <ul>
            {config.domains.map((domain) => <li key={domain}>{domain}</li>)}
          </ul>
        </InfoPanel>
        <InfoPanel title="Shared transactions">
          <ul>
            {config.transactionLinks.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </InfoPanel>
        <InfoPanel title="First capabilities">
          <ul>
            {config.capabilities.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </InfoPanel>
      </section>

      <footer className="product-shell__footer">
        <span>{config.appKey}</span>
        <span>Separate app surface. Shared server engines.</span>
      </footer>
    </main>
  )
}

function InfoPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article className="product-shell__panel">
      <h3>{title}</h3>
      {children}
    </article>
  )
}

function StatusPill({ children, ok }: { children: ReactNode; ok: boolean }) {
  return <div className={ok ? "product-shell__status product-shell__status--ok" : "product-shell__status"}>{children}</div>
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured) return configured.replace(/\/$/, "")
  if (typeof window === "undefined") return ""
  const { hostname, protocol } = window.location
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local")) {
    return `${protocol}//${hostname}:6005`
  }
  return ""
}

function resolveMainAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (typeof window === "undefined") return normalizedPath
  const { hostname, protocol } = window.location
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local")) {
    return `${protocol}//${hostname}:6010${normalizedPath}`
  }
  return normalizedPath
}
