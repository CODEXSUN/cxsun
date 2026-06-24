import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, DatabaseBackup, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react"
import { cxSyncCloudBrowserHeaders, cxSyncCloudBrowserUrl } from "../connections/connection-client"

type FleetTenant = { database: string; databaseHost: string; id: number; name: string; tenantCode: string }
type FleetItem = { candidateDatabase: string; error: string | null; id: string; isCanary: boolean; sourceDatabase: string; status: "pending" | "cloning" | "validated" | "failed"; tenantCode: string; tenantName: string }
type FleetBatch = { failedCount: number; id: string; items: FleetItem[]; readyCount: number; releaseVersion: string; status: "prepared" | "cloning" | "ready" | "failed"; targetCount: number }

export function FleetUpgradePage() {
  const [tenants, setTenants] = useState<FleetTenant[]>([])
  const [batches, setBatches] = useState<FleetBatch[]>([])
  const [cloneEnabled, setCloneEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const latest = batches[0] ?? null
  const pendingCount = useMemo(() => latest?.items.filter((item) => item.status === "pending").length ?? 0, [latest])

  useEffect(() => { void refresh() }, [])

  async function refresh() {
    setLoading(true)
    setError("")
    try {
      const [tenantBody, batchBody] = await Promise.all([
        request<{ tenants: FleetTenant[] }>("/api/v1/cxsync-cloud/fleet/tenants"),
        request<{ batches: FleetBatch[]; cloneEnabled: boolean }>("/api/v1/cxsync-cloud/fleet/batches"),
      ])
      setTenants(tenantBody.tenants ?? [])
      setBatches(batchBody.batches ?? [])
      setCloneEnabled(Boolean(batchBody.cloneEnabled))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setLoading(false)
    }
  }

  async function prepareFleet() {
    setWorking(true)
    setError("")
    setMessage("")
    try {
      const body = await request<{ batch: FleetBatch }>("/api/v1/cxsync-cloud/fleet/batches", {
        body: JSON.stringify({
          canaryTenantId: tenants[0]?.id,
          idempotencyKey: `fleet-${__CXSYNC_VERSION__}-${new Date().toISOString().slice(0, 10)}`,
          releaseVersion: __CXSYNC_VERSION__,
          tenantIds: tenants.map((tenant) => tenant.id),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      setMessage(`Fleet batch ${body.batch.id.slice(0, 8)} prepared for ${body.batch.targetCount} tenant(s). No source database was changed.`)
      await refresh()
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setWorking(false)
    }
  }

  async function cloneNext() {
    if (!latest) return
    setWorking(true)
    setError("")
    setMessage("")
    try {
      const body = await request<{ batch: FleetBatch }>(`/api/v1/cxsync-cloud/fleet/batches/${latest.id}/clone-next`, { method: "POST" })
      setMessage(body.batch.status === "ready" ? "Every fleet candidate validated. Production cutover is still intentionally disabled." : "Next tenant clone rehearsal finished. Review its evidence before continuing.")
      await refresh()
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="workspace-panel page-surface page-surface--cloud tenant-service-panel">
      <header className="panel-heading-row">
        <div><small>Fleet maintenance</small><h2>All-tenant upgrade rehearsal</h2><p>Clone every live tenant with all data, migrate the candidate, validate exact retained row counts, and stop on the first failure. This page never switches a production tenant database.</p></div>
        <button className="secondary-button" disabled={loading || working} onClick={refresh} type="button">{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
      </header>

      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {message ? <div className="form-message form-message--success">{message}</div> : null}
      {!cloneEnabled ? <div className="form-message form-message--warning"><AlertTriangle size={16} />Clone execution is locked. Set both <code>CXSYNC_FLEET_CLONE_ENABLED=true</code> and <code>CXSYNC_FLEET_SOURCE_QUIESCED=true</code> only after the rehearsal window is approved and tenant writes are stopped.</div> : null}

      <div className="overview-status-grid">
        <Summary icon={<DatabaseBackup size={18} />} label="Active tenants" value={String(tenants.length)} />
        <Summary icon={<ShieldCheck size={18} />} label="Strategy" value="Canary · serial" />
        <Summary icon={<CheckCircle2 size={18} />} label="Validated" value={latest ? `${latest.readyCount}/${latest.targetCount}` : "No batch"} />
        <Summary icon={<AlertTriangle size={18} />} label="Failed" value={String(latest?.failedCount ?? 0)} />
      </div>

      <div className="cloud-connection-actions">
        <button className="primary-button" disabled={working || loading || !tenants.length || Boolean(latest && !["ready", "failed"].includes(latest.status))} onClick={prepareFleet} type="button">{working ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}Prepare release {__CXSYNC_VERSION__}</button>
        <button className="secondary-button" disabled={working || !cloneEnabled || !latest || latest.status === "failed" || latest.status === "ready" || !pendingCount} onClick={cloneNext} type="button"><DatabaseBackup size={17} />Clone next tenant</button>
      </div>

      {latest ? (
        <div className="tenant-service-list">
          <div className="tenant-service-list__head"><span>Tenant</span><span>Source → candidate</span><span>Status</span></div>
          {latest.items.map((item) => (
            <article className="tenant-service-row" key={item.id}>
              <span><strong>{item.tenantName}</strong><small>{item.tenantCode}{item.isCanary ? " · canary" : ""}</small></span>
              <span><small>{item.sourceDatabase}</small><strong>{item.candidateDatabase}</strong></span>
              <span><strong>{item.status}</strong>{item.error ? <small>{item.error}</small> : null}</span>
            </article>
          ))}
        </div>
      ) : <div className="empty-mini">Prepare the first release batch after reviewing the tenant inventory.</div>}
    </section>
  )
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="summary-item"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = cxSyncCloudBrowserUrl() || window.location.origin
  const response = await fetch(`${baseUrl}${path}`, { ...init, credentials: "include", headers: { ...cxSyncCloudBrowserHeaders(), ...init.headers } })
  const body = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok || !body) throw new Error(body?.error || `CXSync Cloud returned HTTP ${response.status}.`)
  return body
}

function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : "Fleet request failed." }
