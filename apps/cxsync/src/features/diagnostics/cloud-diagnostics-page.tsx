import { useState } from "react"
import { AlertTriangle, CheckCircle2, CloudCog, LoaderCircle, RefreshCw, XCircle } from "lucide-react"
import type { CloudDiagnosticCheck, CloudDiagnostics } from "../../shared/connection-contracts"
import { cxSyncCloudBrowserHeaders, cxSyncCloudBrowserUrl } from "../connections/connection-client"

export function CloudDiagnosticsPage() {
  const [result, setResult] = useState<CloudDiagnostics | null>(null)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState("")
  const [error, setError] = useState("")

  async function run() {
    setRunning(true)
    setError("")
    setResult(null)
    try {
      if (window.cxsyncDesktop) {
        setPhase("Connecting securely from Desktop to CXSync Cloud...")
        setResult(await window.cxsyncDesktop.runCloudDiagnostics())
      } else {
        setPhase("Checking Cloud health endpoint...")
        const baseUrl = cxSyncCloudBrowserUrl() || window.location.origin
        const transport: CloudDiagnosticCheck[] = [await endpointCheck("cloud-health", "Cloud health endpoint", `${baseUrl}/health`, {})]
        setPhase("Checking protected CXSync API...")
        transport.push(await endpointCheck("cloud-status", "Protected CXSync API", `${baseUrl}/api/v1/cxsync-cloud/status`, { headers: cxSyncCloudBrowserHeaders() }))
        setPhase("Inspecting release, MariaDB, tenants, storage, and tools...")
        const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/diagnostics`, { credentials: "include", headers: cxSyncCloudBrowserHeaders() })
        const body = await response.json().catch(() => null) as { diagnostics?: CloudDiagnostics; error?: string } | null
        if (!response.ok || !body?.diagnostics) throw new Error(body?.error || `Cloud diagnostics returned HTTP ${response.status}.`)
        const checks = [...transport, ...body.diagnostics.checks]
        setResult({ ...body.diagnostics, checks, overall: overallOf(checks) })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Cloud diagnostics failed.")
    } finally {
      setRunning(false)
      setPhase("")
    }
  }

  return <section className="workspace-panel page-surface cloud-diagnostics-page">
    <header className="panel-heading-row"><div><small>Deployment support</small><h2>Cloud diagnostics</h2><p>Read-only checks for CXSync API access, deployed release, MariaDB, tenant databases, storage, client tools, and maintenance safety flags.</p></div><button className="primary-button" disabled={running} onClick={() => void run()} type="button">{running ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{running ? "Checking..." : result ? "Run again" : "Run diagnostics"}</button></header>
    {phase ? <div className="form-message"><LoaderCircle className="spin" size={17} />{phase}</div> : null}
    {error ? <div className="form-message form-message--error">{error}</div> : null}
    {result ? <>
      <div className={`diagnostic-overall diagnostic-overall--${result.overall}`}><StatusIcon status={result.overall === "healthy" ? "pass" : result.overall === "warning" ? "warning" : "fail"} /><div><strong>{result.overall === "healthy" ? "Cloud is ready" : result.overall === "warning" ? "Cloud needs review" : "Cloud has deployment blockers"}</strong><small>Checked {new Date(result.checkedAt).toLocaleString()} · code {result.deployment.packageVersion} · database {result.database.recordedPlatformVersion || "unknown"}</small></div></div>
      <div className="overview-status-grid"><Summary label="Runtime" value={result.deployment.runtimeMode} /><Summary label="MariaDB" value={result.database.serverVersion || "Unavailable"} /><Summary label="Active tenants" value={String(result.database.activeTenants ?? "Unknown")} /><Summary label="Missing DBs" value={String(result.database.missingTenantDatabases ?? "Unknown")} /></div>
      <div className="diagnostic-check-list">{result.checks.map((item) => <article className={`diagnostic-check diagnostic-check--${item.status}`} key={item.id}><StatusIcon status={item.status} /><div><strong>{item.label}</strong><p>{item.detail}</p>{item.recommendation ? <small>{item.recommendation}</small> : null}</div><span>{item.status}</span></article>)}</div>
    </> : !running ? <div className="empty-mini"><CloudCog size={26} />Run diagnostics before deployment or reinstall to identify connection and database problems.</div> : null}
  </section>
}

function StatusIcon({ status }: { status: CloudDiagnosticCheck["status"] }) { return status === "pass" ? <CheckCircle2 size={22} /> : status === "warning" ? <AlertTriangle size={22} /> : <XCircle size={22} /> }
function Summary({ label, value }: { label: string; value: string }) { return <article className="summary-item"><span><CloudCog size={18} /></span><div><strong>{value}</strong><small>{label}</small></div></article> }
function overallOf(checks: CloudDiagnosticCheck[]): CloudDiagnostics["overall"] { return checks.some((item) => item.status === "fail") ? "unhealthy" : checks.some((item) => item.status === "warning") ? "warning" : "healthy" }
async function endpointCheck(id: string, label: string, url: string, init: RequestInit): Promise<CloudDiagnosticCheck> { const started = Date.now(); try { const response = await fetch(url, { ...init, credentials: "include" }); return { detail: `HTTP ${response.status} in ${Date.now() - started} ms.`, id, label, recommendation: response.ok ? null : "Check Nginx, the maintenance container, service authentication, and published ports.", status: response.ok ? "pass" : "fail" } } catch (reason) { return { detail: reason instanceof Error ? reason.message : "Endpoint unreachable.", id, label, recommendation: "Check DNS, TLS, Nginx and the CXSync maintenance container.", status: "fail" } }
}
