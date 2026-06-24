import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Clock3,
  Copy,
  Database,
  History,
  KeyRound,
  LoaderCircle,
  MonitorCog,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Table2,
  Trash2,
  ShieldCheck,
} from "lucide-react"
import { AnimatedTabs, DashboardShell, getCxDesignSystem, type DashboardShellNavGroup } from "@cxsun/ui"
import type { AuthSession } from "../auth/auth-client"
import type {
  LocalEnvironmentStatus,
  CxSyncGeneratedServiceKey,
  CxSyncServiceKeyStatus,
  CxSyncCloudServiceHandshake,
  CxSyncMasterTenant,
  TenantCloudSnapshot,
  TenantConnection,
  TenantDatabaseInspection,
  TenantHandshakeHistoryItem,
  TenantConnectionInput,
  TenantConnectionVerification,
  TenantSchemaBaseline,
  TenantSchemaBuildStatus,
  TenantSchemaDiffResult,
  TenantSyncJob,
  TenantSyncServiceStatus,
  TenantUpgradePlan,
  TenantUpgradePreflight,
  TenantUpgradeExecution,
  TenantBackupRecord,
} from "../../shared/connection-contracts"
import { connectionClient, cxSyncCloudBrowserHeaders } from "../connections/connection-client"
import { FleetUpgradePage } from "../fleet/fleet-upgrade-page"

type Page = "overview" | "connections" | "add" | "show" | "desktop-local" | "cloud-service" | "tenant-service" | "fleet"

const navGroups: Array<DashboardShellNavGroup<Page>> = [
  {
    id: "start",
    items: [
      { icon: Activity, id: "overview", label: "Overview" },
    ],
    label: "Start",
    standalone: true,
  },
  {
    id: "desktop",
    items: [
      { icon: Server, id: "connections", label: "Tenant connections" },
      { icon: Plus, id: "add", label: "Add tenant" },
      { icon: Database, id: "desktop-local", label: "Desktop storage" },
    ],
    label: "Desktop console",
    standalone: true,
  },
  {
    id: "cloud",
    items: [
      { icon: KeyRound, id: "cloud-service", label: "Cloud service key" },
    ],
    label: "Cloud service",
    standalone: true,
  },
]

const cloudNavGroups: Array<DashboardShellNavGroup<Page>> = [
  {
    id: "start",
    items: [
      { icon: Cloud, id: "overview", label: "Cloud overview" },
      { icon: Server, id: "tenant-service", label: "Tenant service" },
      { icon: ShieldCheck, id: "fleet", label: "Fleet upgrades" },
      { icon: KeyRound, id: "cloud-service", label: "Cloud service key" },
    ],
    label: "Cloud service",
    standalone: true,
  },
]

const titles: Record<Page, string> = {
  add: "Add tenant connection",
  "cloud-service": "Cloud service key",
  connections: "Tenant connections",
  "desktop-local": "Desktop storage",
  fleet: "Fleet upgrades",
  overview: "Overview",
  show: "Tenant connection",
  "tenant-service": "Tenant service",
}

const design = getCxDesignSystem("blue")

export function WorkspaceShell({ onLogout, session }: { onLogout(): void; session: AuthSession }) {
  const [page, setPage] = useState<Page>("overview")
  const [selectedId, setSelectedId] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const isDesktopRuntime = connectionClient().isDesktop

  function openConnection(id: string) {
    setSelectedId(id)
    setPage("show")
  }

  return (
    <DashboardShell
      activeAppId="cxsync"
      activePage={page}
      apps={[{ description: "Tenant database connection manager", icon: MonitorCog, id: "cxsync", name: "CXSync", shortName: "CXSync" }]}
      brand={{ mark: "CX", name: "CXSync", subtitle: "Admin" }}
      navGroups={isDesktopRuntime ? navGroups : cloudNavGroups}
      navStyle={design.navStyle}
      onHome={() => setPage("overview")}
      onLogout={onLogout}
      onNavigate={setPage}
      title={titles[page]}
      tone={design.tone}
      user={{ displayName: session.name, email: session.email, roleLabel: session.role }}
      version={__CXSYNC_VERSION__}
    >
      {page === "overview" ? <OverviewPage onAddTenant={() => setPage("add")} onCloud={() => setPage("cloud-service")} onDesktop={() => setPage("desktop-local")} onTenants={() => setPage("connections")} /> : null}
      {page === "connections" ? <ConnectionList key={refreshKey} onAdd={() => setPage("add")} onOpen={openConnection} /> : null}
      {page === "add" ? <ConnectionForm onCancel={() => setPage("connections")} onSaved={(record) => { setRefreshKey((value) => value + 1); openConnection(record.id) }} /> : null}
      {page === "show" ? <ConnectionShow id={selectedId} onBack={() => setPage("connections")} onDeleted={() => { setRefreshKey((value) => value + 1); setPage("connections") }} /> : null}
      {page === "desktop-local" ? <LocalEnvironmentPage /> : null}
      {page === "cloud-service" ? <CloudServiceKeyPage /> : null}
      {page === "tenant-service" ? <TenantServicePage /> : null}
      {page === "fleet" ? <FleetUpgradePage /> : null}
    </DashboardShell>
  )
}

function OverviewPage({ onAddTenant, onCloud, onDesktop, onTenants }: { onAddTenant(): void; onCloud(): void; onDesktop(): void; onTenants(): void }) {
  return connectionClient().isDesktop
    ? <DesktopOverviewPage onAddTenant={onAddTenant} onCloud={onCloud} onDesktop={onDesktop} onTenants={onTenants} />
    : <CloudOverviewPage onCloud={onCloud} />
}

function DesktopOverviewPage({ onAddTenant, onCloud, onDesktop, onTenants }: { onAddTenant(): void; onCloud(): void; onDesktop(): void; onTenants(): void }) {
  const [records, setRecords] = useState<TenantConnection[]>([])
  const [serviceKey, setServiceKey] = useState<CxSyncServiceKeyStatus | null>(null)
  const [cloudHandshake, setCloudHandshake] = useState<CxSyncCloudServiceHandshake | null>(null)
  const [cloudUrl, setCloudUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [verifyingCloud, setVerifyingCloud] = useState(false)
  const [savingCloudUrl, setSavingCloudUrl] = useState(false)
  const [error, setError] = useState("")
  const [cloudNotice, setCloudNotice] = useState("")

  useEffect(() => {
    Promise.allSettled([
      connectionClient().listTenantConnections(),
      loadOptionalServiceKeyStatus(),
      loadOptionalCloudServiceHandshake(),
    ])
      .then(([recordsResult, serviceKeyResult, handshakeResult]) => {
        if (recordsResult.status === "fulfilled") setRecords(recordsResult.value)
        else setError(messageOf(recordsResult.reason))

        if (serviceKeyResult.status === "fulfilled") {
          setServiceKey(serviceKeyResult.value.status)
          setCloudUrl(serviceKeyResult.value.status?.cloudServiceUrl || "")
          setCloudNotice(serviceKeyResult.value.notice)
        } else {
          setCloudNotice(messageOf(serviceKeyResult.reason))
        }

        if (handshakeResult.status === "fulfilled") {
          setCloudHandshake(handshakeResult.value)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveOverviewCloudUrl() {
    setSavingCloudUrl(true)
    setCloudNotice("")
    setError("")
    try {
      const next = await saveCxSyncCloudServiceUrl(cloudUrl)
      setServiceKey(next)
      setCloudUrl(next.cloudServiceUrl || cloudUrl)
      setCloudHandshake(null)
      setCloudNotice("Cloud service URL saved. Run handshake again to verify this URL.")
    } catch (reason) {
      setCloudNotice(messageOf(reason))
    } finally {
      setSavingCloudUrl(false)
    }
  }

  async function verifyCloudConnection() {
    setVerifyingCloud(true)
    setCloudNotice("")
    setError("")
    try {
      const next = await verifyCloudServiceHandshake()
      setCloudHandshake(next)
      if (!next.ok) setCloudNotice(next.message)
    } catch (reason) {
      setCloudNotice(messageOf(reason))
    } finally {
      setVerifyingCloud(false)
    }
  }

  const checkedTenants = records.filter((record) => record.lastHandshake)
  const cloudAcceptedTenants = records.filter((record) => record.lastHandshake?.cloud.ok)
  const failedTenants = records.filter((record) => {
    const handshake = record.lastHandshake
    return handshake ? !handshake.local.ok || !handshake.cloud.ok : false
  })
  const latestHandshake = checkedTenants
    .map((record) => record.lastHandshake?.verifiedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <section className="overview-page overview-page--desktop">
      <header className="overview-hero overview-hero--desktop">
        <div>
          <small>Desktop overview</small>
          <h2>CXSync Desktop console</h2>
          <p>This is the Electron operator app. It stores local CXSync records, sends handshakes to cloud, and runs tenant verification from your machine.</p>
        </div>
        <button className="primary-button" onClick={onAddTenant} type="button"><Plus size={17} />Add tenant</button>
      </header>

      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {loading ? <LoadingLine /> : null}

      <div className="cloud-connection-card">
        <article className="endpoint-card endpoint-card--desktop-only">
          <header>
            <span><MonitorCog size={22} /></span>
            <div><small>Desktop end</small><h3>Desktop connects to cloud</h3></div>
          </header>
          <p>Desktop sends requests to CXSync Cloud. Generate the shared key on the cloud console, paste it into this desktop app, then run the handshake.</p>
          <dl>
            <Detail label="Desktop service key" value={serviceKey?.hasKey ? `Found locally (${serviceKey.keyPreview})` : "Service key not found"} />
            <Detail label="Desktop bridge" value="Electron bridge active" />
            <Detail label="Cloud acceptance" value={cloudHandshake ? cloudHandshake.status : "Not verified yet"} />
            <Detail label="Base URL reachability" value={formatEndpointStatus(cloudHandshake?.frontend)} />
            <Detail label="Backend API" value={formatEndpointStatus(cloudHandshake?.backend)} />
            <Detail label="Last handshake" value={cloudHandshake ? `${cloudHandshake.status} · ${formatCheckedAt(cloudHandshake.checkedAt)}` : "Not verified yet"} />
            <Detail label="Cloud response" value={cloudHandshake?.message || cloudNotice || "Click handshake to verify connection"} />
          </dl>
          <div className="cloud-url-inline">
            <label>
              <span>Cloud service URL</span>
              <input onChange={(event) => setCloudUrl(event.target.value)} placeholder="Set CXSYNC_CLOUD_PUBLIC_URL" type="url" value={cloudUrl} />
            </label>
            <button className="secondary-button" disabled={!cloudUrl.trim() || savingCloudUrl} onClick={saveOverviewCloudUrl} type="button">{savingCloudUrl ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}Save URL</button>
          </div>
          <div className="cloud-connection-actions">
            <button className="primary-button" disabled={verifyingCloud} onClick={verifyCloudConnection} type="button">{verifyingCloud ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{verifyingCloud ? "Handshaking..." : "Handshake cloud"}</button>
            <button className="secondary-button" onClick={onCloud} type="button"><KeyRound size={16} />Service key</button>
            <button className="secondary-button" onClick={onDesktop} type="button"><Database size={16} />Desktop storage</button>
          </div>
        </article>
      </div>

      <div className="overview-status-grid">
        <SummaryItem icon={<Server size={18} />} label="Tenants" value={String(records.length)} />
        <SummaryItem icon={<CheckCircle2 size={18} />} label="Cloud accepted" tone={cloudAcceptedTenants.length ? "healthy" : "attention"} value={String(cloudAcceptedTenants.length)} />
        <SummaryItem icon={<AlertTriangle size={18} />} label="Need attention" tone={failedTenants.length ? "attention" : "healthy"} value={String(failedTenants.length)} />
        <SummaryItem icon={<Clock3 size={18} />} label="Last handshake" value={latestHandshake ? formatCheckedAt(latestHandshake) : "Not yet"} />
      </div>

      <section className="overview-next">
        <header><small>Next action</small><h3>{records.length ? "Run or review tenant handshake" : "Create the first tenant connection"}</h3></header>
        <p>{records.length ? "Open tenant connections, choose a tenant, then run Handshake. Desktop will send the request and Cloud will accept only if the key and admin credentials are valid." : "Start by adding local tenant database details and cloud portal details. After that, generate/save the cloud key and run handshake."}</p>
        <div>
          <button className="secondary-button" onClick={onTenants} type="button"><Server size={16} />Tenant connections</button>
          <button className="secondary-button" onClick={onCloud} type="button"><Cloud size={16} />Cloud service</button>
        </div>
      </section>
    </section>
  )
}

function CloudOverviewPage({ onCloud }: { onCloud(): void }) {
  const [serviceKey, setServiceKey] = useState<CxSyncServiceKeyStatus | null>(null)
  const [cloudHandshake, setCloudHandshake] = useState<CxSyncCloudServiceHandshake | null>(null)
  const [backendStatus, setBackendStatus] = useState<{ message: string; ok: boolean; statusCode: number | null } | null>(null)
  const [cloudUrl, setCloudUrl] = useState("")
  const [checkingBackend, setCheckingBackend] = useState(false)
  const [savingCloudUrl, setSavingCloudUrl] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cloudNotice, setCloudNotice] = useState("")
  const [autoChecked, setAutoChecked] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      loadOptionalServiceKeyStatus(),
      loadOptionalCloudServiceHandshake(),
    ])
      .then(([serviceKeyResult, handshakeResult]) => {
        if (serviceKeyResult.status === "fulfilled") {
          setServiceKey(serviceKeyResult.value.status)
          setCloudUrl(serviceKeyResult.value.status?.cloudServiceUrl || "")
          setCloudNotice(serviceKeyResult.value.notice)
        } else {
          setCloudNotice(messageOf(serviceKeyResult.reason))
        }
        if (handshakeResult.status === "fulfilled") setCloudHandshake(handshakeResult.value)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading || autoChecked || !cloudUrl.trim()) return
    setAutoChecked(true)
    void recheckCloudBackend()
  }, [autoChecked, cloudUrl, loading, serviceKey])

  async function recheckCloudBackend() {
    const baseUrl = (cloudUrl || cloudHandshake?.apiUrl || serviceKey?.cloudServiceUrl || "").trim().replace(/\/+$/, "")
    if (!baseUrl) {
      setBackendStatus({ message: "Cloud service URL is not configured.", ok: false, statusCode: null })
      return
    }
    let parsed: URL
    try {
      parsed = new URL(baseUrl)
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported protocol")
    } catch {
      setBackendStatus({ message: "Enter a complete URL like http://127.0.0.1:6077 before checking.", ok: false, statusCode: null })
      return
    }
    setCheckingBackend(true)
    try {
      const apiBase = parsed.toString().replace(/\/+$/, "")
      const response = await fetch(`${apiBase}/api/v1/cxsync-cloud/status`, { credentials: "include", headers: cxSyncCloudBrowserHeaders() })
      if (!response.ok) {
        setBackendStatus({ message: response.status === 401 ? "Cloud admin session expired. Sign out and sign in again." : `Backend status endpoint returned HTTP ${response.status}.`, ok: false, statusCode: response.status })
        return
      }
      const latest = await fetchLatestCloudHandshake(apiBase)
      if (latest) {
        setCloudHandshake(latest)
        setBackendStatus({ message: "Backend connected. Latest desktop handshake loaded.", ok: true, statusCode: response.status })
      } else {
        setBackendStatus({ message: "Backend connected. No desktop handshake record has been saved yet.", ok: true, statusCode: response.status })
      }
    } catch (reason) {
      setBackendStatus({ message: reason instanceof Error ? reason.message : "Backend status endpoint is unreachable.", ok: false, statusCode: null })
    } finally {
      setCheckingBackend(false)
    }
  }

  function updateCloudUrl(value: string) {
    setCloudUrl(value)
    setBackendStatus(null)
    if (value.trim()) setCloudNotice("Click Recheck backend to verify this cloud URL.")
  }

  async function saveCloudUrl() {
    setSavingCloudUrl(true)
    setCloudNotice("")
    try {
      const normalized = normalizeCloudUrlInput(cloudUrl)
      const next = await saveCxSyncCloudServiceUrl(normalized)
      setServiceKey(next)
      setCloudUrl(next.cloudServiceUrl || cloudUrl)
      setCloudNotice("Cloud service URL saved.")
    } catch (reason) {
      setCloudNotice(messageOf(reason))
    } finally {
      setSavingCloudUrl(false)
    }
  }

  return (
    <section className="overview-page overview-page--cloud">
      <header className="overview-hero overview-hero--cloud">
        <div>
          <small>Cloud overview</small>
          <h2>CXSync Cloud service</h2>
          <p>This is the cloud-facing view. The VPS service waits for desktop requests, checks the shared service key, and replies with accepted or rejected status.</p>
        </div>
        <button className="primary-button" onClick={onCloud} type="button"><KeyRound size={17} />Cloud service key</button>
      </header>

      {loading ? <LoadingLine /> : null}

      <div className="cloud-connection-card">
        <article className="endpoint-card endpoint-card--cloud-only">
          <header>
            <span><Cloud size={22} /></span>
            <div><small>Cloud end</small><h3>{cloudHandshake?.ok ? "Desktop handshake connected" : "Waiting for desktop handshake"}</h3></div>
          </header>
          <p>Cloud does not start sync work by itself. It only accepts a desktop request when the service key exists and matches on both ends.</p>
          <dl>
            <Detail label="Cloud service URL" value={cloudUrl || cloudHandshake?.apiUrl || serviceKey?.cloudServiceUrl || "Not configured"} />
            <Detail label="Cloud service key" value={backendStatus?.ok || cloudHandshake?.ok ? "Protected on backend" : "Hidden from browser"} />
            <Detail label="Accepted when" value="Desktop sends matching service key" />
            <Detail label="Base URL reachability" value={formatEndpointStatus(cloudHandshake?.frontend)} />
            <Detail label="Backend API" value={formatEndpointStatus(backendStatus ?? cloudHandshake?.backend)} />
            <Detail label="Last accepted request" value={cloudHandshake?.ok ? formatCheckedAt(cloudHandshake.checkedAt) : "No accepted request yet"} />
            <Detail label="Cloud response" value={backendStatus?.message || cloudHandshake?.message || cloudNotice || "Waiting for desktop handshake"} />
          </dl>
          <div className="cloud-url-inline cloud-url-inline--stacked">
            <label>
              <span>Cloud service URL</span>
              <input onChange={(event) => updateCloudUrl(event.target.value)} placeholder="http://127.0.0.1:6077" type="url" value={cloudUrl} />
            </label>
            <div className="cloud-connection-actions">
              <button className="secondary-button" disabled={!cloudUrl.trim() || savingCloudUrl} onClick={saveCloudUrl} type="button">{savingCloudUrl ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}Save URL</button>
              <button className="secondary-button" disabled={checkingBackend} onClick={recheckCloudBackend} type="button">{checkingBackend ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Recheck backend</button>
            </div>
          </div>
          <div className="cloud-connection-actions">
            <button className="secondary-button" onClick={onCloud} type="button"><KeyRound size={16} />Manage cloud key</button>
          </div>
        </article>
      </div>

      <section className="overview-next overview-next--cloud">
        <header><small>Cloud rule</small><h3>Cloud accepts, desktop initiates</h3></header>
        <p>Generate and activate the key in this cloud console, copy it into Electron Desktop, then press Handshake cloud. The cloud overview records the accepted desktop request.</p>
      </section>
    </section>
  )
}

function ConnectionList({ onAdd, onOpen }: { onAdd(): void; onOpen(id: string): void }) {
  const [records, setRecords] = useState<TenantConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    connectionClient().listTenantConnections()
      .then(setRecords)
      .catch((reason) => setError(messageOf(reason)))
      .finally(() => setLoading(false))
  }, [])

  const attentionCount = records.filter((record) => connectionAttention(record).tone !== "healthy").length
  const healthyCount = records.length - attentionCount

  return (
    <section className="workspace-panel">
      <header className="panel-heading-row">
        <div><small>Connection registry</small><h2>Tenant connections</h2><p>Local and cloud database information for each tenant.</p></div>
        <button className="primary-button" onClick={onAdd} type="button"><Plus size={17} />Add tenant</button>
      </header>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {loading ? <LoadingLine /> : null}
      {!loading && records.length > 0 ? (
        <div className="connection-summary">
          <SummaryItem icon={<Server size={18} />} label="Connections" value={String(records.length)} />
          <SummaryItem icon={<CheckCircle2 size={18} />} label="Healthy" tone="healthy" value={String(healthyCount)} />
          <SummaryItem icon={<AlertTriangle size={18} />} label="Need attention" tone={attentionCount ? "attention" : "healthy"} value={String(attentionCount)} />
        </div>
      ) : null}
      {!loading && records.length === 0 ? (
        <div className="empty-state"><Server size={26} /><h3>No tenant connections</h3><p>Add the first tenant to configure local and cloud access.</p></div>
      ) : null}
      <div className="connection-list">
        {records.map((record) => {
          const attention = connectionAttention(record)
          return (
            <button className={`connection-list-item connection-list-item--${attention.tone}`} key={record.id} onClick={() => onOpen(record.id)} type="button">
              <span className="connection-avatar">{initials(record.tenantName)}</span>
              <span><strong>{record.tenantName}</strong><small>{record.tenantCode} · {record.localDatabase}</small></span>
              <span><strong>{record.cloudDomain || record.cloudApiUrl}</strong><small>{attention.action}</small></span>
              <span className={`connection-state connection-state--${attention.tone}`}>
                {attention.tone === "healthy" ? <CheckCircle2 size={16} /> : attention.tone === "unchecked" ? <Clock3 size={16} /> : <AlertTriangle size={16} />}
                <span><strong>{attention.label}</strong><small>{record.lastHandshake ? formatCheckedAt(record.lastHandshake.verifiedAt) : "Run handshake"}</small></span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ConnectionForm({ mode = "create", onCancel, onSaved, record }: { mode?: "create" | "edit"; onCancel(): void; onSaved(record: TenantConnection): void; record?: TenantConnection }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const cloudApiUrlRef = useRef<HTMLInputElement | null>(null)
  const cloudAdminEmailRef = useRef<HTMLInputElement | null>(null)
  const cloudAdminPasswordRef = useRef<HTMLInputElement | null>(null)
  const isEdit = mode === "edit" && Boolean(record)

  function useLocalBackendUrl() {
    if (!cloudApiUrlRef.current) return
    cloudApiUrlRef.current.value = "http://127.0.0.1:6005"
    setError("")
  }

  function useLocalSeedAdmin() {
    if (cloudAdminEmailRef.current) cloudAdminEmailRef.current.value = "admin@tenant.com"
    if (cloudAdminPasswordRef.current) cloudAdminPasswordRef.current.value = "admin@123"
    setError("")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const data = new FormData(event.currentTarget)
    try {
      onSaved(await connectionClient().saveTenantConnection(readTenantInput(data), record?.id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="workspace-panel tenant-form" onSubmit={submit}>
      <header>
        <small>{isEdit ? "Update registry entry" : "New registry entry"}</small>
        <h2>{isEdit ? "Edit tenant connection" : "Add tenant connection"}</h2>
        <p>{isEdit ? "Change local database or cloud portal details. Leave password fields blank to keep the existing encrypted password." : "Store tenant-local and cloud connection information. Passwords are encrypted by Windows."}</p>
      </header>
      <FormSection icon={<Server size={19} />} title="Tenant">
        <Field label="Tenant name"><input defaultValue={record?.tenantName ?? ""} name="tenantName" required /></Field>
        <Field label="Tenant code"><input defaultValue={record?.tenantCode ?? ""} name="tenantCode" required /></Field>
        <Field label="Corporate ID"><input defaultValue={record?.corporateId ?? ""} name="corporateId" required /></Field>
      </FormSection>
      <FormSection icon={<Database size={19} />} title="Local tenant database">
        <Field label="Host"><input defaultValue={record?.localHost ?? "127.0.0.1"} name="localHost" required /></Field>
        <Field label="Port"><input defaultValue={record?.localPort ?? 3306} max="65535" min="1" name="localPort" required type="number" /></Field>
        <Field label="Database"><input defaultValue={record?.localDatabase ?? ""} name="localDatabase" required /></Field>
        <Field label="User"><input defaultValue={record?.localUser ?? "root"} name="localUser" required /></Field>
        <Field label="Password"><input autoComplete="new-password" name="localPassword" placeholder={isEdit ? "Leave blank to keep existing password" : ""} required={!isEdit} type="password" /></Field>
      </FormSection>
      <FormSection icon={<Cloud size={19} />} title="Cloud portal">
        <Field label="Tenant backend API URL"><input defaultValue={record?.cloudApiUrl ?? ""} name="cloudApiUrl" placeholder="Example: http://127.0.0.1:6005 or https://tenant-api.example.com" ref={cloudApiUrlRef} required type="url" /></Field>
        <div className="tenant-url-presets">
          <button className="secondary-button" onClick={useLocalBackendUrl} type="button"><Server size={16} />Use local backend 6005</button>
          <span>Use this for local testing when the main billing/admin backend is running from this repo.</span>
        </div>
        <p className="field-help">Do not use CXSync desktop port 6044 or CXSync Cloud service port 6077 here. This URL must answer /api/v1/auth/login.</p>
        <Field label="Tenant login domain"><input defaultValue={record?.cloudDomain ?? ""} name="cloudDomain" placeholder="codexsun.com" required /></Field>
        <p className="field-help">This is the tenant identity sent as x-login-domain. Do not enter localhost, 127.0.0.1, or a port here.</p>
        <Field label="Admin email"><input defaultValue={record?.cloudAdminEmail ?? ""} name="cloudAdminEmail" ref={cloudAdminEmailRef} required type="email" /></Field>
        <Field label="Admin password"><input autoComplete="new-password" name="cloudAdminPassword" placeholder={isEdit ? "Leave blank to keep existing password" : ""} ref={cloudAdminPasswordRef} required={!isEdit} type="password" /></Field>
        <div className="tenant-url-presets">
          <button className="secondary-button" onClick={useLocalSeedAdmin} type="button"><KeyRound size={16} />Use local seed admin</button>
          <span>For local backend testing, this fills the seeded tenant admin from the repo .env/default seed.</span>
        </div>
      </FormSection>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      <footer className="form-footer">
        <button className="secondary-button" onClick={onCancel} type="button">Cancel</button>
        <button className="primary-button" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : isEdit ? <Pencil size={17} /> : <Plus size={17} />}{isEdit ? "Update tenant" : "Save tenant"}</button>
      </footer>
    </form>
  )
}

function ConnectionShow({ id, onBack, onDeleted }: { id: string; onBack(): void; onDeleted(): void }) {
  const [record, setRecord] = useState<TenantConnection | null>(null)
  const [verification, setVerification] = useState<TenantConnectionVerification | null>(null)
  const [history, setHistory] = useState<TenantHandshakeHistoryItem[]>([])
  const [cloudSnapshot, setCloudSnapshot] = useState<TenantCloudSnapshot | null>(null)
  const [inspection, setInspection] = useState<TenantDatabaseInspection | null>(null)
  const [schemaBaseline, setSchemaBaseline] = useState<TenantSchemaBaseline | null>(null)
  const [schemaBuildStatus, setSchemaBuildStatus] = useState<TenantSchemaBuildStatus | null>(null)
  const [schemaDiff, setSchemaDiff] = useState<TenantSchemaDiffResult | null>(null)
  const [upgradePlan, setUpgradePlan] = useState<TenantUpgradePlan | null>(null)
  const [upgradePreflight, setUpgradePreflight] = useState<TenantUpgradePreflight | null>(null)
  const [upgradeExecution, setUpgradeExecution] = useState<TenantUpgradeExecution | null>(null)
  const [tenantBackup, setTenantBackup] = useState<TenantBackupRecord | null>(null)
  const [syncJob, setSyncJob] = useState<TenantSyncJob | null>(null)
  const [syncJobs, setSyncJobs] = useState<TenantSyncJob[]>([])
  const [syncServiceStatus, setSyncServiceStatus] = useState<TenantSyncServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [capturingBaseline, setCapturingBaseline] = useState(false)
  const [capturingCodebaseBaseline, setCapturingCodebaseBaseline] = useState(false)
  const [capturingCloudSnapshot, setCapturingCloudSnapshot] = useState(false)
  const [refreshingCloudSnapshot, setRefreshingCloudSnapshot] = useState(false)
  const [comparingSchema, setComparingSchema] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [generatingUpgradePlan, setGeneratingUpgradePlan] = useState(false)
  const [runningPreflight, setRunningPreflight] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [executingUpgrade, setExecutingUpgrade] = useState(false)
  const [runningSyncJob, setRunningSyncJob] = useState(false)
  const [checkingSyncService, setCheckingSyncService] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [upgradeActionMessage, setUpgradeActionMessage] = useState("")
  const [error, setError] = useState("")
  const cloudSnapshotRunRef = useRef(0)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    const client = connectionClient()
    Promise.all([
      client.getTenantConnection(id),
      loadTenantHandshakeHistory(id),
      loadTenantCloudSnapshot(id),
      loadTenantSchemaBaseline(id),
      loadTenantUpgradePlan(id),
      loadTenantUpgradePreflight(id),
      loadTenantUpgradeExecution(id),
      loadTenantBackup(id),
      loadTenantSyncJob(id),
      loadTenantSyncJobs(id),
    ])
      .then(([next, nextHistory, nextCloudSnapshot, nextBaseline, nextUpgradePlan, nextPreflight, nextExecution, nextBackup, nextSyncJob, nextSyncJobs]) => {
        setRecord(next)
        setVerification(next?.lastHandshake ?? null)
        setHistory(nextHistory)
        setCloudSnapshot(nextCloudSnapshot)
        setSchemaBaseline(nextBaseline)
        setUpgradePlan(nextUpgradePlan)
        setUpgradePreflight(nextPreflight)
        setUpgradeExecution(nextExecution)
        setTenantBackup(nextBackup)
        setSyncJob(nextSyncJob)
        setSyncJobs(nextSyncJobs)
      })
      .catch((reason) => setError(messageOf(reason)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !capturingCodebaseBaseline) return
    let cancelled = false
    const refresh = async () => {
      try {
        const next = await loadCodebaseSchemaBuildStatus(id)
        if (!cancelled) setSchemaBuildStatus(next)
      } catch {
        // Status is helpful but non-critical while the main operation is running.
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, 2_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [capturingCodebaseBaseline, id])

  async function verify() {
    setVerifying(true)
    setError("")
    try {
      const next = await connectionClient().verifyTenantConnection(id)
      setVerification(next)
      setHistory(await loadTenantHandshakeHistory(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setVerifying(false)
    }
  }

  async function inspect() {
    setInspecting(true)
    setError("")
    try {
      setInspection(await inspectTenantDatabase(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setInspecting(false)
    }
  }

  async function captureCloudSnapshot() {
    const runId = cloudSnapshotRunRef.current + 1
    cloudSnapshotRunRef.current = runId
    setCapturingCloudSnapshot(true)
    setError("")
    try {
      const next = await captureTenantCloudSnapshot(id)
      if (cloudSnapshotRunRef.current === runId) setCloudSnapshot(next)
    } catch (reason) {
      if (cloudSnapshotRunRef.current === runId) setError(messageOf(reason))
    } finally {
      if (cloudSnapshotRunRef.current === runId) setCapturingCloudSnapshot(false)
    }
  }

  function cancelCloudSnapshot() {
    cloudSnapshotRunRef.current += 1
    setCapturingCloudSnapshot(false)
    setError("")
  }

  async function refreshCloudSnapshot() {
    setRefreshingCloudSnapshot(true)
    setError("")
    try {
      setCloudSnapshot(await loadTenantCloudSnapshot(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setRefreshingCloudSnapshot(false)
    }
  }

  async function captureBaseline() {
    setCapturingBaseline(true)
    setError("")
    try {
      const next = await captureTenantSchemaBaseline(id)
      setSchemaBaseline(next)
      setSchemaDiff(null)
      setUpgradePlan(null)
      setUpgradePreflight(null)
      setUpgradeExecution(null)
      setTenantBackup(null)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setCapturingBaseline(false)
    }
  }

  async function captureCodebaseBaseline() {
    setCapturingCodebaseBaseline(true)
    setError("")
    try {
      const next = await captureCodebaseSchemaBaseline(id)
      setSchemaBaseline(next)
      setSchemaBuildStatus(await loadCodebaseSchemaBuildStatus(id))
      setSchemaDiff(null)
      setUpgradePlan(null)
      setUpgradePreflight(null)
      setUpgradeExecution(null)
      setTenantBackup(null)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setCapturingCodebaseBaseline(false)
    }
  }

  async function compareSchema() {
    setComparingSchema(true)
    setError("")
    try {
      setSchemaDiff(await compareTenantSchema(id))
      setSchemaBaseline(await loadTenantSchemaBaseline(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setComparingSchema(false)
    }
  }

  async function generateUpgradePlan() {
    setGeneratingUpgradePlan(true)
    setError("")
    setUpgradeActionMessage("Generating a fresh upgrade plan from the latest schema comparison...")
    try {
      setUpgradePlan(await createTenantUpgradePlan(id))
      setUpgradePreflight(null)
      setUpgradeExecution(null)
      setTenantBackup(null)
      setUpgradeActionMessage("Upgrade plan generated. Run preflight before execution.")
    } catch (reason) {
      setError(messageOf(reason))
      setUpgradeActionMessage("")
    } finally {
      setGeneratingUpgradePlan(false)
    }
  }

  async function runUpgradePreflight() {
    setRunningPreflight(true)
    setError("")
    setUpgradeActionMessage("Running preflight checks: baseline, plan, handshake, backup, and schema privileges...")
    try {
      setUpgradePreflight(await executeTenantUpgradePreflight(id))
      setUpgradeActionMessage("Preflight finished. Review blocked/warning checks before execution.")
    } catch (reason) {
      setError(messageOf(reason))
      setUpgradeActionMessage("")
    } finally {
      setRunningPreflight(false)
    }
  }

  async function createBackup() {
    setCreatingBackup(true)
    setError("")
    setUpgradeActionMessage("Creating recovery backup: locating dump tool, dumping tenant DB, restoring into a temporary DB, then comparing schema hash...")
    try {
      setTenantBackup(await createTenantRecoveryBackup(id))
      setUpgradePreflight(await executeTenantUpgradePreflight(id))
      setUpgradeExecution(null)
      setUpgradeActionMessage("Restore-tested backup created. Execute is now available if preflight is ready.")
    } catch (reason) {
      setError(messageOf(reason))
      setUpgradeActionMessage(`Backup stopped: ${messageOf(reason)}`)
    } finally {
      setCreatingBackup(false)
    }
  }

  async function executeUpgrade() {
    if (!window.confirm("Execute approved schema steps on the local tenant database? Confirm that the restore-tested backup is available before continuing.")) return
    setExecutingUpgrade(true)
    setError("")
    setUpgradeActionMessage("Executing approved local schema steps one by one. CXSync will stop on the first SQL failure.")
    try {
      const result = await executeTenantUpgrade(id)
      setUpgradeExecution(result)
      setInspection(await inspectTenantDatabase(id))
      setSchemaDiff(await compareTenantSchema(id))
      setUpgradeActionMessage(result.status === "failed" ? "Execution failed. Review the execution report below." : "Execution finished. Review the audit report below.")
    } catch (reason) {
      setError(messageOf(reason))
      setUpgradeActionMessage(`Execution stopped: ${messageOf(reason)}`)
    } finally {
      setExecutingUpgrade(false)
    }
  }

  function explainBlockedExecute(reason: string) {
    setUpgradeActionMessage(reason)
  }

  async function runSyncJob() {
    setRunningSyncJob(true)
    setError("")
    try {
      const next = await executeTenantSyncJob(id)
      setSyncJob(next)
      setSyncJobs(await loadTenantSyncJobs(id))
      setCloudSnapshot(await loadTenantCloudSnapshot(id))
      setInspection(await inspectTenantDatabase(id))
      setSchemaBaseline(await loadTenantSchemaBaseline(id))
      setUpgradePlan(await loadTenantUpgradePlan(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setRunningSyncJob(false)
    }
  }

  async function continueSyncJob() {
    setRunningSyncJob(true)
    setError("")
    try {
      const next = await continueTenantSyncJob(id)
      setSyncJob(next)
      setSyncJobs(await loadTenantSyncJobs(id))
      setInspection(await inspectTenantDatabase(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setRunningSyncJob(false)
    }
  }

  async function retrySyncJob() {
    setRunningSyncJob(true)
    setError("")
    try {
      const next = await retryTenantSyncJob(id)
      setSyncJob(next)
      setSyncJobs(await loadTenantSyncJobs(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setRunningSyncJob(false)
    }
  }

  async function checkSyncService() {
    setCheckingSyncService(true)
    setError("")
    try {
      setSyncServiceStatus(await checkTenantSyncService(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setCheckingSyncService(false)
    }
  }

  async function exportSyncReport() {
    setError("")
    try {
      const result = await exportTenantSyncReport(id)
      setSyncServiceStatus((current) => current ?? { apiUrl: result.path, checkedAt: new Date().toISOString(), latencyMs: 0, message: `Exported ${result.fileName}`, ok: true, service: "report-export" })
      window.alert(`Sync report exported:\n${result.path}`)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  async function remove() {
    if (!window.confirm("Delete this tenant connection?")) return
    await connectionClient().deleteTenantConnection(id)
    onDeleted()
  }

  function savedEditedConnection(next: TenantConnection) {
    const cloudApiChanged = record ? normalizeUrlForCompare(record.cloudApiUrl) !== normalizeUrlForCompare(next.cloudApiUrl) : false
    setRecord(next)
    setVerification(next.lastHandshake ?? null)
    if (cloudApiChanged) {
      setCloudSnapshot(null)
      setSyncJob(null)
      setSyncJobs([])
    }
    setEditing(false)
  }

  if (loading) return <LoadingLine />
  if (!record) return <section className="workspace-panel"><button className="link-button" onClick={onBack} type="button"><ArrowLeft size={15} />Back</button><p>Tenant connection not found.</p></section>

  if (editing) {
    return (
      <div className="workspace-stack">
        <section className="workspace-panel">
          <header className="panel-heading-row">
            <div><button className="back-button" onClick={() => setEditing(false)} type="button"><ArrowLeft size={16} />Connection</button><h2>Edit {record.tenantName}</h2><p>Update credentials, then run Handshake again to verify.</p></div>
          </header>
        </section>
        <ConnectionForm mode="edit" onCancel={() => setEditing(false)} onSaved={savedEditedConnection} record={record} />
      </div>
    )
  }

  return (
    <div className="workspace-stack">
      <section className="workspace-panel">
        <header className="panel-heading-row">
          <div><button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} />Connections</button><h2>{record.tenantName}</h2><p>{record.tenantCode} · {record.corporateId}</p></div>
          <div className="sync-actions">
            <button className="secondary-button" onClick={() => setEditing(true)} type="button"><Pencil size={16} />Edit</button>
            <button className="secondary-button danger-button" onClick={remove} type="button"><Trash2 size={16} />Delete</button>
            <button className="secondary-button" disabled={inspecting} onClick={inspect} type="button">{inspecting ? <LoaderCircle className="spin" size={17} /> : <Table2 size={17} />}Inspect tables</button>
            <button className="primary-button" disabled={verifying} onClick={verify} type="button">{verifying ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}Handshake</button>
          </div>
        </header>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
      </section>
      <AnimatedTabs
        className="tenant-tabs"
        defaultValue="overview"
        tabs={[
          {
            content: <TenantOverview onUpdated={savedEditedConnection} record={record} verification={verification} />,
            label: "Overview",
            value: "overview",
          },
          {
            content: <HandshakeHistory history={history} />,
            label: `Handshake history${history.length ? ` (${history.length})` : ""}`,
            value: "history",
          },
          {
            content: <CloudSnapshotPanel capturing={capturingCloudSnapshot} expectedApiUrl={record.cloudApiUrl} onCancel={cancelCloudSnapshot} onCapture={captureCloudSnapshot} onRefresh={refreshCloudSnapshot} refreshing={refreshingCloudSnapshot} snapshot={cloudSnapshot} />,
            label: currentSnapshotFor(record, cloudSnapshot) ? `Cloud snapshot (${cloudSnapshot?.status})` : cloudSnapshot ? "Cloud snapshot (stale)" : "Cloud snapshot",
            value: "cloud",
          },
          {
            content: <TenantInspection inspection={inspection} inspecting={inspecting} onInspect={inspect} />,
            label: inspection ? `Local schema (${inspection.totals.tableCount})` : "Local schema",
            value: "schema",
          },
          {
            content: <SchemaDiff baseline={schemaBaseline} buildStatus={schemaBuildStatus} capturing={capturingBaseline} capturingCodebase={capturingCodebaseBaseline} comparing={comparingSchema} diff={schemaDiff} onCapture={captureBaseline} onCaptureCodebase={captureCodebaseBaseline} onCompare={compareSchema} />,
            label: schemaDiff ? `Schema diff (${schemaDiff.summary.total})` : "Schema diff",
            value: "diff",
          },
          {
            content: <UpgradePlan actionMessage={upgradeActionMessage} backup={tenantBackup} baselineAvailable={Boolean(schemaBaseline)} creatingBackup={creatingBackup} executing={executingUpgrade} execution={upgradeExecution} generating={generatingUpgradePlan} onBlockedExecute={explainBlockedExecute} onCreateBackup={createBackup} onExecute={executeUpgrade} onGenerate={generateUpgradePlan} onRunPreflight={runUpgradePreflight} plan={upgradePlan} preflight={upgradePreflight} runningPreflight={runningPreflight} />,
            label: upgradePlan ? `Upgrade plan (${upgradePlan.summary.total})` : "Upgrade plan",
            value: "upgrade",
          },
          {
            content: <SyncEnginePanel checkingService={checkingSyncService} job={syncJob} jobs={syncJobs} onCheckService={checkSyncService} onContinue={continueSyncJob} onExport={exportSyncReport} onRetry={retrySyncJob} onRun={runSyncJob} running={runningSyncJob} serviceStatus={syncServiceStatus} />,
            label: syncJob ? `Schema Sync (${syncJob.status})` : "Schema Sync",
            value: "sync",
          },
        ]}
      />
    </div>
  )
}

function TenantOverview({ onUpdated, record, verification }: { onUpdated(record: TenantConnection): void; record: TenantConnection; verification: TenantConnectionVerification | null }) {
  const [fixing, setFixing] = useState(false)
  const [fixError, setFixError] = useState("")
  const needsLocalBackendFix = tenantApiUrlNeedsLocalBackend(record.cloudApiUrl)

  async function useLocalBackendUrl() {
    setFixing(true)
    setFixError("")
    try {
      const saved = await connectionClient().saveTenantConnection(tenantInputFromRecord(record, { cloudApiUrl: "http://127.0.0.1:6005" }), record.id)
      onUpdated(saved)
    } catch (reason) {
      setFixError(messageOf(reason))
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="workspace-stack">
      <section className="workspace-panel">
        <header><small>Tenant connection</small><h2>Connection overview</h2></header>
        {needsLocalBackendFix ? (
          <div className="tenant-url-warning">
            <AlertTriangle size={18} />
            <div>
              <strong>This tenant is using a CXSync URL, not the tenant backend API.</strong>
              <small>For local development, use the main server backend URL that owns /api/v1/auth/login. From this repo .env, that is usually http://127.0.0.1:6005.</small>
            </div>
            <button className="secondary-button" disabled={fixing} onClick={useLocalBackendUrl} type="button">{fixing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Use 6005</button>
          </div>
        ) : null}
        {fixError ? <div className="form-message form-message--error">{fixError}</div> : null}
        <div className="detail-grid">
          <DetailCard icon={<Database size={19} />} title="Local database">
            <Detail label="Server" value={`${record.localHost}:${record.localPort}`} />
            <Detail label="Database" value={record.localDatabase} />
            <Detail label="User" value={record.localUser} />
          </DetailCard>
          <DetailCard icon={<Cloud size={19} />} title="Cloud portal">
            <Detail label="API" value={record.cloudApiUrl} />
            <Detail label="Domain" value={record.cloudDomain} />
            <Detail label="Admin" value={record.cloudAdminEmail} />
          </DetailCard>
        </div>
      </section>
      {verification ? <VersionComparison record={record} verification={verification} /> : <section className="workspace-panel"><div className="empty-mini">Run handshake to compare local and cloud status.</div></section>}
    </div>
  )
}

function VersionComparison({ record, verification }: { record: TenantConnection; verification: TenantConnectionVerification }) {
  const diagnostic = handshakeDiagnostic(record, verification)
  return (
    <section className="workspace-panel">
      <header><small>Handshake result</small><h2>Local and cloud comparison</h2></header>
      <div className="comparison-grid">
        <ComparisonCard icon={<Database size={20} />} label="Local database" result={verification.local} />
        <div className={verification.versionsMatch ? "version-match version-match--ok" : "version-match"}>
          <Activity size={21} /><strong>{verification.versionsMatch ? "Versions match" : "Versions differ"}</strong>
        </div>
        <ComparisonCard icon={<Cloud size={20} />} label="Cloud application" result={verification.cloud} />
      </div>
      {diagnostic ? (
        <div className={`handshake-diagnostic handshake-diagnostic--${diagnostic.tone}`}>
          <AlertTriangle size={18} />
          <div><strong>{diagnostic.title}</strong><small>{diagnostic.detail}</small></div>
        </div>
      ) : null}
    </section>
  )
}

function HandshakeHistory({ history }: { history: TenantHandshakeHistoryItem[] }) {
  return (
    <section className="workspace-panel">
      <header className="panel-heading-row">
        <div><small>Saved checks</small><h2>Handshake history</h2><p>Last 25 local/cloud checks stored in the CXSync database.</p></div>
        <History size={22} />
      </header>
      {history.length === 0 ? <div className="empty-mini">No handshake history yet.</div> : (
        <div className="history-list">
          {history.map((item) => (
            <article className="history-item" key={item.id}>
              <span className={item.local.ok ? "status-dot status-dot--ok" : "status-dot status-dot--error"} />
              <div><strong>{formatCheckedAt(item.verifiedAt)}</strong><small>Local {item.local.ok ? "ok" : "failed"} · Cloud {item.cloud.ok ? "ok" : "failed"} · {item.versionsMatch ? "versions match" : "versions differ"}</small></div>
              <div><strong>{item.local.version} / {item.cloud.version}</strong><small>{item.local.latencyMs + item.cloud.latencyMs} ms total</small></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function CloudSnapshotPanel({
  capturing,
  expectedApiUrl,
  onCancel,
  onCapture,
  onRefresh,
  refreshing,
  snapshot,
}: {
  capturing: boolean
  expectedApiUrl: string
  onCancel(): void
  onCapture(): void
  onRefresh(): void
  refreshing: boolean
  snapshot: TenantCloudSnapshot | null
}) {
  const staleSnapshot = Boolean(snapshot && normalizeUrlForCompare(snapshot.apiUrl) !== normalizeUrlForCompare(expectedApiUrl))
  return (
    <section className="workspace-panel">
      <header className="panel-heading-row">
        <div><small>Backend API evidence</small><h2>Cloud snapshot</h2><p>Captures tenant admin login, session token, and cloud health through the portal API. No direct VPS database access.</p></div>
        <div className="sync-actions cloud-snapshot-actions">
          <button className="secondary-button" disabled={capturing || refreshing} onClick={onRefresh} type="button">{refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}Refresh</button>
          {capturing ? (
            <button className="secondary-button danger-button" onClick={onCancel} type="button"><AlertTriangle size={17} />Cancel</button>
          ) : (
            <button className="primary-button" onClick={onCapture} type="button"><Cloud size={17} />Capture cloud snapshot</button>
          )}
        </div>
      </header>
      {capturing ? <CloudSnapshotTrace snapshot={null} running /> : null}
      {!snapshot && !capturing ? <div className="empty-mini">Capture the first cloud snapshot to save current portal reachability and version evidence.</div> : null}
      {snapshot ? (
        <div className={capturing ? "cloud-snapshot-content cloud-snapshot-content--hidden" : "cloud-snapshot-content"}>
          {staleSnapshot ? (
            <div className="cloud-snapshot-stale">
              <AlertTriangle size={18} />
              <div>
                <strong>Saved snapshot is from a different backend URL.</strong>
                <small>Current tenant API is {expectedApiUrl}. This saved snapshot was captured from {snapshot.apiUrl}. Click Capture cloud snapshot to create fresh local evidence.</small>
              </div>
            </div>
          ) : null}
          <div className="connection-summary">
            <SummaryItem icon={<Cloud size={18} />} label="Snapshot status" tone={!staleSnapshot && snapshot.status === "ready" ? "healthy" : "attention"} value={staleSnapshot ? "stale" : snapshot.status} />
            <SummaryItem icon={<Activity size={18} />} label="Cloud version" tone={snapshot.cloudVersion === "unavailable" ? "attention" : "neutral"} value={snapshot.cloudVersion} />
            <SummaryItem icon={<Table2 size={18} />} label="Cloud tables" tone={snapshot.schema ? "healthy" : "attention"} value={snapshot.schema ? String(snapshot.schema.totals.tableCount) : "not captured"} />
          </div>
          {snapshot.schema ? (
            <div className="connection-summary">
              <SummaryItem icon={<Activity size={18} />} label="Cloud columns" value={formatNumber(snapshot.schema.totals.columnCount)} />
              <SummaryItem icon={<Table2 size={18} />} label="Cloud indexes" value={formatNumber(snapshot.schema.totals.indexCount)} />
              <SummaryItem icon={<Database size={18} />} label="Cloud storage" value={formatBytes(snapshot.schema.totals.dataLength + snapshot.schema.totals.indexLength)} />
            </div>
          ) : null}
          <div className="detail-grid">
            <DetailCard icon={<Cloud size={19} />} title="Cloud portal">
              <Detail label="API" value={snapshot.apiUrl} />
              <Detail label="Domain" value={snapshot.domain || "-"} />
              <Detail label="Tenant" value={snapshot.tenantCode || "-"} />
            </DetailCard>
            <DetailCard icon={<CheckCircle2 size={19} />} title="Verification">
              <Detail label="Health" value={`${snapshot.health.ok ? "OK" : "Needs attention"} · ${snapshot.health.status} · ${snapshot.health.latencyMs} ms`} />
              <Detail label="Session" value={`${snapshot.session.ok ? "OK" : "Needs attention"} · ${snapshot.session.latencyMs} ms`} />
              <Detail label="User" value={snapshot.session.userEmail ?? "-"} />
            </DetailCard>
            {snapshot.schema ? (
              <DetailCard icon={<Database size={19} />} title="Cloud tenant database">
                <Detail label="Database" value={snapshot.schema.database} />
                <Detail label="Schema hash" value={snapshot.schema.schemaHash.slice(0, 16)} />
                <Detail label="Captured" value={formatCheckedAt(snapshot.schema.capturedAt).replace("Checked ", "")} />
              </DetailCard>
            ) : null}
          </div>
          <div className={`cloud-snapshot-message cloud-snapshot-message--${snapshot.status}`}>
            {snapshot.status === "ready" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <div><strong>{snapshot.message}</strong><small>{formatCheckedAt(snapshot.capturedAt)}{snapshot.session.selectedTenant ? ` · selected tenant ${snapshot.session.selectedTenant}` : ""}</small></div>
          </div>
          <CloudSnapshotTrace snapshot={snapshot} />
        </div>
      ) : null}
    </section>
  )
}

function CloudSnapshotTrace({ running = false, snapshot }: { running?: boolean; snapshot: TenantCloudSnapshot | null }) {
  const totalLatency = (snapshot?.health.latencyMs ?? 0) + (snapshot?.session.latencyMs ?? 0)
  const schemaTotals = snapshot?.schema?.totals
  const rows = [
    {
      detail: snapshot ? `${snapshot.apiUrl}${snapshot.domain ? ` · ${snapshot.domain}` : ""}` : "Waiting for tenant backend API URL.",
      label: "Target tenant backend",
      status: snapshot ? "done" : running ? "running" : "pending",
    },
    {
      detail: snapshot ? "Admin login returned a session token before these metrics were saved." : "Posting admin email, password, corporate ID, and tenant surface.",
      label: "Admin login",
      status: snapshot ? "done" : running ? "running" : "pending",
    },
    {
      detail: snapshot ? `${snapshot.health.status} · ${snapshot.health.latencyMs} ms · version ${snapshot.cloudVersion}` : "Reading /health from the tenant backend.",
      label: "Backend health",
      status: snapshot ? (snapshot.health.ok ? "done" : "failed") : running ? "pending" : "pending",
    },
    {
      detail: snapshot ? `${snapshot.session.userEmail ?? "no user"}${snapshot.session.selectedTenant ? ` · selected tenant ${snapshot.session.selectedTenant}` : ""} · ${snapshot.session.latencyMs} ms` : "Verifying token with /api/v1/auth/session.",
      label: "Session check",
      status: snapshot ? (snapshot.session.ok ? "done" : "failed") : running ? "pending" : "pending",
    },
    {
      detail: schemaTotals
        ? `${formatNumber(schemaTotals.tableCount)} tables · ${formatNumber(schemaTotals.columnCount)} columns · ${formatNumber(schemaTotals.indexCount)} indexes · ${formatBytes(schemaTotals.dataLength + schemaTotals.indexLength)}`
        : snapshot
          ? "Tenant schema snapshot was not captured."
          : "Reading /api/v1/cxsync/tenant-snapshot.",
      label: "Tenant schema metadata",
      status: snapshot ? (snapshot.schema ? "done" : "failed") : running ? "pending" : "pending",
    },
    {
      detail: snapshot ? `${snapshot.status} · ${totalLatency} ms measured health/session time · saved ${formatCheckedAt(snapshot.capturedAt).replace("Checked ", "")}` : "Saving snapshot into local CXSync storage.",
      label: "Saved evidence",
      status: snapshot ? (snapshot.status === "failed" ? "failed" : "done") : running ? "pending" : "pending",
    },
  ] as const

  return (
    <div className="cloud-snapshot-trace">
      <header>
        <div><small>Operation trace</small><h3>{running ? "Capturing cloud snapshot..." : "What CXSync checked"}</h3></div>
        {snapshot ? <span>{snapshot.status}</span> : <span>running</span>}
      </header>
      <div className="cloud-snapshot-trace__rows">
        {rows.map((row) => (
          <article className={`cloud-snapshot-trace__row cloud-snapshot-trace__row--${row.status}`} key={row.label}>
            <span>{row.status === "done" ? <CheckCircle2 size={16} /> : row.status === "failed" ? <AlertTriangle size={16} /> : running ? <LoaderCircle className="spin" size={16} /> : <Clock3 size={16} />}</span>
            <div><strong>{row.label}</strong><small>{row.detail}</small></div>
          </article>
        ))}
      </div>
      {snapshot?.message ? <p>{snapshot.message}</p> : null}
    </div>
  )
}

function TenantInspection({ inspection, inspecting, onInspect }: { inspection: TenantDatabaseInspection | null; inspecting: boolean; onInspect(): void }) {
  return (
    <section className="workspace-panel">
      <header className="panel-heading-row">
        <div><small>Read-only local scan</small><h2>Local tenant schema</h2><p>Reads table, column, and index metadata and saves a snapshot in CXSync storage.</p></div>
        <button className="secondary-button" disabled={inspecting} onClick={onInspect} type="button">{inspecting ? <LoaderCircle className="spin" size={17} /> : <Table2 size={17} />}Inspect</button>
      </header>
      {!inspection ? <div className="empty-mini">Run inspection to see tables, columns, indexes, row estimates, and primary-key attention.</div> : (
        <>
          <div className="connection-summary">
            <SummaryItem icon={<Table2 size={18} />} label="Tables" value={String(inspection.totals.tableCount)} />
            <SummaryItem icon={<Activity size={18} />} label="Columns" value={formatNumber(inspection.totals.columnCount)} />
            <SummaryItem icon={<AlertTriangle size={18} />} label="Missing primary key" tone={inspection.totals.missingPrimaryKeyCount ? "attention" : "healthy"} value={String(inspection.totals.missingPrimaryKeyCount)} />
          </div>
          <div className="connection-summary">
            <SummaryItem icon={<Activity size={18} />} label="Rows estimate" value={formatNumber(inspection.totals.rowsEstimate)} />
            <SummaryItem icon={<Table2 size={18} />} label="Indexes" value={formatNumber(inspection.totals.indexCount)} />
            <SummaryItem icon={<Database size={18} />} label="Storage" value={formatBytes(inspection.totals.dataLength + inspection.totals.indexLength)} />
          </div>
          <div className="table-inspection">
            <table>
              <thead><tr><th>Table</th><th>Engine</th><th>PK</th><th>Columns</th><th>Indexes</th><th>Rows</th><th>Data</th><th>Index size</th><th>Updated</th></tr></thead>
              <tbody>
                {inspection.tables.map((table) => (
                  <tr key={table.tableName}>
                    <td>{table.tableName}</td>
                    <td>{table.engine || "-"}</td>
                    <td><span className={table.hasPrimaryKey ? "schema-pill schema-pill--ok" : "schema-pill schema-pill--warn"}>{table.hasPrimaryKey ? "Yes" : "No"}</span></td>
                    <td>{formatNumber(table.columnCount)}</td>
                    <td>{formatNumber(table.indexCount)}</td>
                    <td>{formatNumber(table.rowsEstimate)}</td>
                    <td>{formatBytes(table.dataLength)}</td>
                    <td>{formatBytes(table.indexLength)}</td>
                    <td>{table.updatedAt ? formatCheckedAt(table.updatedAt).replace("Checked ", "") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function SchemaDiff({
  baseline,
  buildStatus,
  capturing,
  capturingCodebase,
  comparing,
  diff,
  onCapture,
  onCaptureCodebase,
  onCompare,
}: {
  baseline: TenantSchemaBaseline | null
  buildStatus: TenantSchemaBuildStatus | null
  capturing: boolean
  capturingCodebase: boolean
  comparing: boolean
  diff: TenantSchemaDiffResult | null
  onCapture(): void
  onCaptureCodebase(): void
  onCompare(): void
}) {
  const orderedItems = [...(diff?.items ?? [])].sort((left, right) => {
    const severity = { critical: 0, warning: 1, info: 2 }
    const status = { missing: 0, changed: 1, extra: 2 }
    return severity[left.severity] - severity[right.severity]
      || status[left.status] - status[right.status]
      || left.objectName.localeCompare(right.objectName)
  })

  return (
    <section className="workspace-panel schema-diff-panel">
      <header className="panel-heading-row">
        <div><small>Schema baseline</small><h2>Schema diff</h2><p>Load the release-packaged expected schema, then compare every local table, column, and index.</p></div>
        <div className="sync-actions">
          <button className="secondary-button" disabled={capturing || capturingCodebase || comparing} onClick={onCapture} type="button">{capturing ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />}Set from local</button>
          <button className="secondary-button" disabled={capturing || capturingCodebase || comparing} onClick={onCaptureCodebase} type="button">{capturingCodebase ? <LoaderCircle className="spin" size={17} /> : <Server size={17} />}{capturingCodebase ? "Loading packaged schema..." : "Load expected schema"}</button>
          <button className="primary-button" disabled={!baseline || capturing || capturingCodebase || comparing} onClick={onCompare} type="button">{comparing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}Compare now</button>
        </div>
      </header>
      {buildStatus && buildStatus.phase !== "idle" ? (
        <div className={`schema-build-status schema-build-status--${buildStatus.phase}`}>
          {buildStatus.phase === "failed" ? <AlertTriangle size={18} /> : buildStatus.phase === "completed" ? <CheckCircle2 size={18} /> : <LoaderCircle className="spin" size={18} />}
          <div>
            <strong>{buildStatus.message}</strong>
            <small>{buildStatus.database ?? "scratch database"} · {buildStatus.tableCount} tables · {formatElapsed(buildStatus.elapsedMs)} elapsed · updated {formatTimeOnly(buildStatus.updatedAt)}</small>
            {buildStatus.error ? <em>{buildStatus.error}</em> : null}
            <div className="schema-build-live-grid">
              <span><b>Phase</b>{buildStatus.phase}</span>
              <span><b>Doing now</b>{buildStatus.operation ?? buildStatus.message}</span>
              <span><b>MariaDB</b>{buildStatus.processState ?? "waiting for next table update"}</span>
              <span><b>Latest tables</b>{buildStatus.recentTables.length ? buildStatus.recentTables.join(", ") : "not created yet"}</span>
            </div>
            {buildStatus.activity.length ? (
              <ol className="schema-build-activity">
                {buildStatus.activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
              </ol>
            ) : null}
            {buildStatus.recentOutput ? <pre className="schema-build-output">{buildStatus.recentOutput}</pre> : null}
          </div>
        </div>
      ) : null}
      {!baseline ? <div className="empty-mini">No active baseline yet. Load the expected schema packaged with this CXSync release.</div> : (
        <div className="connection-summary">
          <SummaryItem icon={<CheckCircle2 size={18} />} label="Baseline tables" value={String(baseline.totals.tableCount)} />
          <SummaryItem icon={<Activity size={18} />} label="Source" value={baseline.source} />
          <SummaryItem icon={<Clock3 size={18} />} label="Captured" value={formatShortDate(baseline.capturedAt)} />
        </div>
      )}
      {diff ? (
        <>
          <div className={`schema-upgrade-state ${diff.summary.critical || diff.summary.warnings ? "schema-upgrade-state--required" : "schema-upgrade-state--clean"}`}>
            {diff.summary.critical || diff.summary.warnings ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
            <div>
              <strong>{diff.summary.critical || diff.summary.warnings ? "Database upgrade requires attention" : "Database schema is current"}</strong>
              <small>{diff.summary.critical ? `${diff.summary.critical} critical difference${diff.summary.critical === 1 ? "" : "s"} must be reviewed before an upgrade.` : diff.summary.warnings ? `${diff.summary.warnings} warning${diff.summary.warnings === 1 ? "" : "s"} should be reviewed.` : "No missing or changed schema objects were detected."}</small>
            </div>
          </div>
          <div className="connection-summary">
            <SummaryItem icon={<AlertTriangle size={18} />} label="Total differences" tone={diff.summary.total ? "attention" : "healthy"} value={String(diff.summary.total)} />
            <SummaryItem icon={<AlertTriangle size={18} />} label="Critical" tone={diff.summary.critical ? "attention" : "healthy"} value={String(diff.summary.critical)} />
            <SummaryItem icon={<Activity size={18} />} label="Warnings" tone={diff.summary.warnings ? "attention" : "healthy"} value={String(diff.summary.warnings)} />
          </div>
          {diff.items.length === 0 ? <div className="empty-mini">Schema matches the active baseline.</div> : (
            <div className="table-inspection schema-diff-table">
              <table>
                <thead><tr><th>Severity</th><th>Status</th><th>Type</th><th>Object</th><th>Message</th><th>Expected</th><th>Actual</th></tr></thead>
                <tbody>
                  {orderedItems.map((item, index) => (
                    <tr className={`schema-diff-row schema-diff-row--${item.severity}`} key={`${item.objectName}-${item.status}-${index}`}>
                      <td><span className={`schema-pill ${item.severity === "critical" ? "schema-pill--warn" : item.severity === "warning" ? "schema-pill--attention" : "schema-pill--ok"}`}>{item.severity}</span></td>
                      <td>{item.status}</td>
                      <td>{item.objectType}</td>
                      <td>{item.objectName}</td>
                      <td>{item.message}</td>
                      <td>{item.expected ?? "-"}</td>
                      <td>{item.actual ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}

function UpgradePlan({
  actionMessage,
  backup,
  baselineAvailable,
  creatingBackup,
  executing,
  execution,
  generating,
  onCreateBackup,
  onExecute,
  onBlockedExecute,
  onGenerate,
  onRunPreflight,
  plan,
  preflight,
  runningPreflight,
}: {
  actionMessage: string
  backup: TenantBackupRecord | null
  baselineAvailable: boolean
  creatingBackup: boolean
  executing: boolean
  execution: TenantUpgradeExecution | null
  generating: boolean
  onCreateBackup(): void
  onExecute(): void
  onBlockedExecute(reason: string): void
  onGenerate(): void
  onRunPreflight(): void
  plan: TenantUpgradePlan | null
  preflight: TenantUpgradePreflight | null
  runningPreflight: boolean
}) {
  const executableSteps = plan?.steps.filter((step) => step.statement && step.risk !== "destructive").length ?? 0
  const executeBlockedReason = executionBlockReason(plan, preflight, backup, executableSteps)
  const readyToExecute = !executeBlockedReason
  const busy = creatingBackup || executing || generating || runningPreflight
  const progressMessage = executing
    ? "Executing approved local schema SQL..."
    : creatingBackup
      ? "Creating and restore-testing recovery backup..."
      : runningPreflight
        ? "Running preflight checks..."
        : generating
          ? "Generating upgrade plan..."
          : actionMessage
  return (
    <section className="workspace-panel upgrade-plan-panel">
      <header className="panel-heading-row">
        <div><small>Controlled execution</small><h2>Upgrade plan</h2><p>Generate, preflight, restore-test backup, then execute only allow-listed local schema SQL with an audit trail.</p></div>
        <div className="sync-actions">
          <button className="secondary-button" disabled={!plan || creatingBackup || generating || runningPreflight} onClick={onCreateBackup} type="button">{creatingBackup ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />}{creatingBackup ? "Creating backup..." : "Create backup"}</button>
          <button className="secondary-button" disabled={!plan || generating || runningPreflight} onClick={onRunPreflight} type="button">{runningPreflight ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />}{runningPreflight ? "Checking..." : "Run preflight"}</button>
          <button
            className={`secondary-button danger-button execute-action-button ${readyToExecute ? "execute-action-button--ready" : "execute-action-button--blocked"}`}
            disabled={busy}
            onClick={() => readyToExecute ? onExecute() : onBlockedExecute(executeBlockedReason)}
            title={readyToExecute ? "Execute approved local schema steps" : executeBlockedReason}
            type="button"
          >
            {executing ? <LoaderCircle className="spin" size={17} /> : <Activity size={17} />}
            {executing ? "Executing..." : readyToExecute ? "Execute approved steps" : "Why execute is blocked"}
          </button>
          <button className="primary-button" disabled={!baselineAvailable || generating || runningPreflight} onClick={onGenerate} type="button">{generating ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{generating ? "Generating plan..." : "Generate plan"}</button>
        </div>
      </header>
      {progressMessage ? (
        <div className={`upgrade-action-status ${busy ? "upgrade-action-status--busy" : executeBlockedReason && progressMessage === executeBlockedReason ? "upgrade-action-status--blocked" : "upgrade-action-status--info"}`}>
          {busy ? <LoaderCircle className="spin" size={18} /> : executeBlockedReason && progressMessage === executeBlockedReason ? <AlertTriangle size={18} /> : <Activity size={18} />}
          <span>{progressMessage}</span>
        </div>
      ) : null}
      {!plan ? <div className="empty-mini">Load the packaged expected schema, then generate a reviewable tenant upgrade plan.</div> : (
        <>
          <div className="connection-summary">
            <SummaryItem icon={<CheckCircle2 size={18} />} label="Safe suggestions" tone="healthy" value={String(plan.summary.safe)} />
            <SummaryItem icon={<AlertTriangle size={18} />} label="Needs review" tone={plan.summary.caution ? "attention" : "healthy"} value={String(plan.summary.caution)} />
            <SummaryItem icon={<AlertTriangle size={18} />} label="Destructive / manual" tone={plan.summary.destructive ? "attention" : "healthy"} value={String(plan.summary.destructive)} />
          </div>
          <div className="upgrade-plan-meta">Draft created {formatCheckedAt(plan.createdAt).replace("Checked ", "")} · baseline {plan.baselineId.slice(0, 8)} · diff {plan.diffSnapshotId.slice(0, 8)}</div>
          {backup ? <div className={`backup-record ${backup.planId === plan.id && backup.status === "restore-verified" ? "backup-record--current" : "backup-record--stale"}`}><Database size={18} /><div><strong>{backup.planId !== plan.id ? "Backup belongs to an older plan" : backup.status === "restore-verified" ? "Restore-tested backup for this plan" : "Backup requires restore verification"}</strong><small>{backup.fileName} · {formatBytes(backup.sizeBytes)} · {backup.tableCount} tables · SHA-256 {backup.sha256.slice(0, 12)}…</small></div></div> : null}
          {preflight && preflight.planId === plan.id ? (
            <div className={`preflight-report ${preflight.ready ? "preflight-report--ready" : "preflight-report--blocked"}`}>
              <header><div>{preflight.ready ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}<span><strong>{preflight.ready ? "Preflight ready" : "Execution blocked"}</strong><small>{preflight.summary.passed} passed · {preflight.summary.warnings} warnings · {preflight.summary.blocked} blocked</small></span></div><small>{formatCheckedAt(preflight.checkedAt)}</small></header>
              <div className="preflight-checks">
                {preflight.checks.map((check) => <article className={`preflight-check preflight-check--${check.status}`} key={check.id}><span>{check.status === "pass" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div><em>{check.status}</em></article>)}
              </div>
            </div>
          ) : null}
          {execution && execution.planId === plan.id ? (
            <div className={`execution-report execution-report--${execution.status}`}>
              <header>
                <div>{execution.status === "failed" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<span><strong>{executionStatusLabel(execution.status)}</strong><small>{execution.summary.applied} applied · {execution.summary.skipped} skipped · {execution.summary.failed} failed</small></span></div>
                <small>{formatCheckedAt(execution.startedAt)}</small>
              </header>
              <div className="execution-steps">
                {execution.steps.map((step) => (
                  <article className={`execution-step execution-step--${step.status}`} key={step.id}>
                    <span>{step.order}</span>
                    <div><strong>{step.title}</strong><small>{step.objectName} · {step.detail}{step.error ? ` · ${step.error}` : ""}</small></div>
                    <em>{step.status}</em>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {plan.steps.length === 0 ? <div className="empty-mini">No upgrade steps are required. The local schema matches the expected baseline.</div> : (
            <div className="upgrade-plan-list">
              {plan.steps.map((step) => (
                <article className={`upgrade-plan-step upgrade-plan-step--${step.risk}`} key={step.id}>
                  <span className="upgrade-plan-order">{step.order}</span>
                  <div className="upgrade-plan-detail">
                    <header><strong>{step.title}</strong><span className={`schema-pill ${step.risk === "safe" ? "schema-pill--ok" : step.risk === "caution" ? "schema-pill--attention" : "schema-pill--warn"}`}>{step.risk}</span></header>
                    <small>{step.objectType} · {step.objectName}</small>
                    <p>{step.rationale}</p>
                    {step.statement ? <pre><code>{step.statement}</code></pre> : <em>Use the owning backend migration or perform a manual review; no SQL suggestion was generated.</em>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function SyncEnginePanel({
  checkingService,
  job,
  jobs,
  onCheckService,
  onContinue,
  onExport,
  onRetry,
  onRun,
  running,
  serviceStatus,
}: {
  checkingService: boolean
  job: TenantSyncJob | null
  jobs: TenantSyncJob[]
  onCheckService(): void
  onContinue(): void
  onExport(): void
  onRetry(): void
  onRun(): void
  running: boolean
  serviceStatus: TenantSyncServiceStatus | null
}) {
  const canContinue = job?.status === "approval-required"
  const canRetry = job?.status === "failed"
  return (
    <section className="workspace-panel sync-engine-panel">
      <header className="panel-heading-row">
        <div><small>Bounded schema workflow</small><h2>Schema Sync</h2><p>Get tenant details, download cloud schema metadata, verify, prepare migration, verify again, and upload an audit report. Business rows are not synchronized.</p></div>
        <div className="sync-actions">
          <button className="secondary-button" disabled={checkingService} onClick={onCheckService} type="button">{checkingService ? <LoaderCircle className="spin" size={17} /> : <Cloud size={17} />}{checkingService ? "Checking..." : "Check service"}</button>
          <button className="secondary-button" disabled={!job || running} onClick={onExport} type="button"><History size={17} />Export report</button>
          <button className="secondary-button" disabled={!canRetry || running} onClick={onRetry} type="button"><RefreshCw size={17} />Retry failed</button>
          <button className="secondary-button" disabled={!canContinue || running} onClick={onContinue} type="button">{running && canContinue ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />}{running && canContinue ? "Continuing..." : "Continue after migration"}</button>
          <button className="primary-button" disabled={running} onClick={onRun} type="button">{running ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{running ? "Running sync..." : "Run bounded sync"}</button>
        </div>
      </header>
      {serviceStatus ? (
        <div className={`cloud-snapshot-message cloud-snapshot-message--${serviceStatus.ok ? "ready" : "failed"}`}>
          {serviceStatus.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div><strong>{serviceStatus.message}</strong><small>{serviceStatus.apiUrl} · {serviceStatus.latencyMs} ms · {formatCheckedAt(serviceStatus.checkedAt)}</small></div>
        </div>
      ) : null}
      {!job ? <div className="empty-mini">Run the bounded sync to create the first auditable job.</div> : (
        <>
          <div className="connection-summary">
            <SummaryItem icon={<Activity size={18} />} label="Job status" tone={job.status === "completed" ? "healthy" : "attention"} value={job.status} />
            <SummaryItem icon={<Table2 size={18} />} label="Local / Cloud tables" value={`${job.summary.localTables} / ${job.summary.cloudTables}`} />
            <SummaryItem icon={<AlertTriangle size={18} />} label="Differences" tone={job.summary.diffTotal ? "attention" : "healthy"} value={String(job.summary.diffTotal)} />
          </div>
          <div className="sync-phase-list">
            {job.phases.map((phase, index) => (
              <article className={`sync-phase sync-phase--${phase.status}`} key={phase.id}>
                <span>{index + 1}</span>
                <div><strong>{phase.label}</strong><small>{phase.detail}</small></div>
                <em>{phase.status}</em>
              </article>
            ))}
          </div>
          {job.summary.uploadReportId ? <div className="cloud-snapshot-message cloud-snapshot-message--ready"><CheckCircle2 size={18} /><div><strong>Audit report uploaded</strong><small>{job.summary.uploadReportId}</small></div></div> : null}
          {jobs.length ? (
            <div className="sync-history">
              <header><strong>Job history</strong><small>Last {jobs.length} sync job{jobs.length === 1 ? "" : "s"}</small></header>
              {jobs.map((item) => (
                <article className={`sync-history-item sync-history-item--${item.status}`} key={item.id}>
                  <div><strong>{item.id.slice(0, 8)} · {item.status}</strong><small>{formatCheckedAt(item.startedAt)} · local/cloud {item.summary.localTables}/{item.summary.cloudTables} · diff {item.summary.diffTotal}</small></div>
                  <em>{item.summary.uploadReportId ? "report uploaded" : item.completedAt ? "local only" : "running"}</em>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function TenantServicePage() {
  const [tenants, setTenants] = useState<CxSyncMasterTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTenantServiceTenants()
      .then(setTenants)
      .catch((reason) => setError(messageOf(reason)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="workspace-panel page-surface page-surface--cloud tenant-service-panel">
      <header className="panel-heading-row">
        <div><small>Tenant service</small><h2>Master tenants</h2><p>Read-only tenant list from the cloud master database. Only tenant, corporate ID, and tenant code are shown.</p></div>
        <button className="secondary-button" disabled={loading} onClick={() => { setLoading(true); setError(""); loadTenantServiceTenants().then(setTenants).catch((reason) => setError(messageOf(reason))).finally(() => setLoading(false)) }} type="button">{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
      </header>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {loading ? <LoadingLine /> : null}
      {!loading && !tenants.length ? <div className="empty-mini">No tenants found in the master database.</div> : null}
      {tenants.length ? (
        <div className="tenant-service-list">
          <div className="tenant-service-list__head">
            <span>Tenant</span>
            <span>Corporate ID</span>
            <span>Tenant code</span>
          </div>
          {tenants.map((tenant) => (
            <article className="tenant-service-row" key={tenant.id}>
              <span><strong>{tenant.tenantName}</strong></span>
              <span>{tenant.corporateId || "-"}</span>
              <span>{tenant.tenantCode || "-"}</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function CloudServiceKeyPage() {
  const desktopRuntime = connectionClient().isDesktop
  const [status, setStatus] = useState<CxSyncServiceKeyStatus | null>(null)
  const [generated, setGenerated] = useState<CxSyncGeneratedServiceKey | null>(null)
  const [manualKey, setManualKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    loadServiceKeyStatus()
      .then((next) => {
        setStatus(next)
      })
      .catch((reason) => setError(messageOf(reason)))
  }, [])

  async function generate() {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const next = await generateCxSyncServiceKey()
      setGenerated(next)
      setManualKey(next.key)
      setMessage("Cloud key generated and activated in CXSync Cloud storage. Copy it now and paste it into Desktop; neither app needs a restart.")
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  async function saveManual() {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const next = await saveCxSyncServiceKey(manualKey)
      setStatus(next)
      setGenerated(null)
      setMessage(desktopRuntime ? "Cloud service key saved in this desktop app. Return to Overview and run Handshake cloud; no restart is required." : "Cloud service key saved for this browser session. Return to Overview and recheck the backend.")
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(`${label} copied to clipboard.`)
    } catch {
      setMessage(`${label} is ready above. Select and copy it manually if clipboard permission is blocked.`)
    }
  }

  const keyToCopy = generated?.key || manualKey.trim()
  const envLine = keyToCopy ? `CXSYNC_SERVICE_KEY=${keyToCopy}` : ""

  return (
    <section className="workspace-panel service-key-panel page-surface page-surface--cloud">
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {message ? <div className="form-message form-message--success">{message}</div> : null}
      {!status && !error ? <LoadingLine /> : null}
      <header className="service-key-heading">
        <span><KeyRound size={19} /></span>
        <h3>Cloud key value</h3>
      </header>
      <div className="tenant-field-grid service-key-field-grid">
        <Field label="Service key"><input autoComplete="off" name="serviceKey" onChange={(event) => setManualKey(event.target.value)} placeholder={desktopRuntime ? "Paste the key generated on CXSync Cloud" : "Generate a new cloud key or paste the VPS CXSYNC_SERVICE_KEY"} type={generated ? "text" : "password"} value={manualKey} /></Field>
      </div>
      <div className="service-key-actions">
        {!desktopRuntime ? <button className="primary-button" disabled={saving} onClick={generate} type="button">{saving ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}Generate cloud key</button> : null}
        <button className="secondary-button" disabled={!keyToCopy} onClick={() => copyText(keyToCopy, "Raw key")} type="button"><Copy size={16} />Copy key</button>
        {desktopRuntime ? <button className="secondary-button" disabled={!envLine} onClick={() => copyText(envLine, "VPS .env line")} type="button"><Copy size={16} />Copy .env line</button> : null}
        {desktopRuntime ? <button className="secondary-button" disabled={!manualKey.trim() || saving} onClick={saveManual} type="button"><KeyRound size={16} />Save key locally</button> : null}
      </div>
      <div className="safe-note">
        <KeyRound size={16} />
        <span>{desktopRuntime ? "Desktop never creates the shared key. Paste the key generated on CXSync Cloud, save it locally, then run Handshake cloud." : "Generate and activate the key here, copy it before leaving this page, and paste it into Desktop. CXSync Cloud stores the active key in its private database; no restart or .env rewrite occurs."} This key is never for clients.</span>
      </div>
    </section>
  )
}

function LocalEnvironmentPage() {
  const [status, setStatus] = useState<LocalEnvironmentStatus | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    connectionClient().getLocalEnvironmentStatus().then(setStatus).catch((reason) => setError(messageOf(reason)))
  }, [])

  return (
    <section className="workspace-panel page-surface page-surface--desktop">
      <header><small>Desktop only</small><h2>Local CXSync storage</h2><p>This page is only for this Windows desktop app: bridge status, local CXSync database, and offline admin records. It does not configure the VPS cloud service.</p></header>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {!status && !error ? <LoadingLine /> : null}
      {status ? (
        <div className="detail-grid">
          <DetailCard icon={<Database size={19} />} title="Desktop CXSync MariaDB">
            <Detail label="Server" value={`${status.host}:${status.port}`} />
            <Detail label="Database" value={status.database} />
            <Detail label="User" value={status.user} />
          </DetailCard>
          <DetailCard icon={<Activity size={19} />} title="Desktop runtime">
            <Detail label="CXSync" value={status.appVersion} />
            <Detail label="MariaDB" value={status.databaseServerVersion} />
            <Detail label="Status" value={status.ok ? "Connected" : "Unavailable"} />
          </DetailCard>
        </div>
      ) : null}
      <HandshakePatternPanel
        tone="desktop"
        title="Desktop handshake pattern"
        steps={[
          ["Connect", "Select a tenant and enter the cloud API URL for CXSync Cloud."],
          ["Get key", "If this is a new setup, generate the cloud service key and save the same key on the VPS."],
          ["Handshake", "Desktop sends the request to cloud, then verifies service key, admin login, version, and tenant snapshot."],
        ]}
      />
      <div className="safe-note safe-note--desktop">
        <Database size={16} />
        <span>Desktop rule: this area stores CXSync config, handshake history, analytics snapshots, and job records in the separate local CXSync database. Tenant master databases are not used for CXSync admin storage.</span>
      </div>
    </section>
  )
}

function FormSection({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return <section className="tenant-form-section"><header><span>{icon}</span><h3>{title}</h3></header><div className="tenant-field-grid">{children}</div></section>
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>
}

function DetailCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return <article className="detail-card"><header><span>{icon}</span><h3>{title}</h3></header><dl>{children}</dl></article>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function HandshakePatternPanel({ steps, title, tone }: { steps: Array<[string, string]>; title: string; tone: "cloud" | "desktop" }) {
  return (
    <section className={`handshake-pattern handshake-pattern--${tone}`}>
      <header>
        <span>{tone === "desktop" ? <MonitorCog size={18} /> : <Cloud size={18} />}</span>
        <div><strong>{title}</strong><small>{tone === "desktop" ? "Desktop sends request" : "Cloud accepts request"}</small></div>
      </header>
      <div>
        {steps.map(([label, detail], index) => (
          <article key={label}>
            <em>{index + 1}</em>
            <div><strong>{label}</strong><small>{detail}</small></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ComparisonCard({ icon, label, result }: { icon: ReactNode; label: string; result: { latencyMs: number; message: string; ok: boolean; version: string } }) {
  return <article className={result.ok ? "comparison-card comparison-card--ok" : "comparison-card comparison-card--error"}><span>{icon}</span><small>{label}</small><strong>{result.version}</strong><p>{result.message}</p><em>{result.latencyMs} ms</em></article>
}

function SummaryItem({ icon, label, tone = "neutral", value }: { icon: ReactNode; label: string; tone?: "neutral" | "healthy" | "attention"; value: string }) {
  return <article className={`summary-item summary-item--${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function LoadingLine() {
  return <div className="loading-line"><LoaderCircle className="spin" size={18} />Loading...</div>
}

function readTenantInput(data: FormData): TenantConnectionInput {
  return {
    cloudAdminEmail: text(data, "cloudAdminEmail"),
    cloudAdminPassword: text(data, "cloudAdminPassword"),
    cloudApiUrl: text(data, "cloudApiUrl"),
    cloudDomain: text(data, "cloudDomain"),
    corporateId: text(data, "corporateId"),
    localDatabase: text(data, "localDatabase"),
    localHost: text(data, "localHost"),
    localPassword: text(data, "localPassword"),
    localPort: Number(text(data, "localPort")),
    localUser: text(data, "localUser"),
    tenantCode: text(data, "tenantCode"),
    tenantName: text(data, "tenantName"),
  }
}

function tenantInputFromRecord(record: TenantConnection, overrides: Partial<TenantConnectionInput> = {}): TenantConnectionInput {
  return {
    cloudAdminEmail: record.cloudAdminEmail,
    cloudAdminPassword: "",
    cloudApiUrl: record.cloudApiUrl,
    cloudDomain: record.cloudDomain,
    corporateId: record.corporateId,
    localDatabase: record.localDatabase,
    localHost: record.localHost,
    localPassword: "",
    localPort: record.localPort,
    localUser: record.localUser,
    tenantCode: record.tenantCode,
    tenantName: record.tenantName,
    ...overrides,
  }
}

function tenantApiUrlNeedsLocalBackend(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.port === "6044" || parsed.port === "6077"
  } catch {
    return false
  }
}

function handshakeDiagnostic(record: TenantConnection, verification: TenantConnectionVerification) {
  if (verification.local.ok && verification.cloud.ok && verification.versionsMatch) return null
  const apiHost = safeHost(record.cloudApiUrl)
  const domain = record.cloudDomain.trim()
  if (isLocalHostName(apiHost) && (isLocalHostName(domain) || domain.includes(":"))) {
    return {
      detail: `API URL can be local (${record.cloudApiUrl}), but Login domain must identify the tenant. Change Login domain from "${record.cloudDomain}" to the tenant domain/slug, for example codexsun.com, then run Handshake again.`,
      title: "Login domain is set to the local API address",
      tone: "warning" as const,
    }
  }
  if (!verification.cloud.ok && /invalid login details/i.test(verification.cloud.message)) {
    if (isLocalHostName(apiHost) && record.cloudAdminEmail.toLowerCase() !== "admin@tenant.com") {
      return {
        detail: `The local backend accepted the tenant domain/corporate ID pattern, but rejected ${record.cloudAdminEmail}. For local seeded data, edit this tenant and use the local seed admin, then run Handshake again.`,
        title: "Local backend rejected this admin email/password",
        tone: "error" as const,
      }
    }
    return {
      detail: `The local database connected, but tenant backend login rejected the admin credential/domain/corporate ID combination. Check Login domain (${record.cloudDomain}), Corporate ID (${record.corporateId}), Admin email, and Admin password.`,
      title: "Tenant backend rejected login",
      tone: "error" as const,
    }
  }
  if (!verification.cloud.ok) {
    return {
      detail: verification.cloud.message,
      title: "Cloud application did not connect",
      tone: "error" as const,
    }
  }
  if (!verification.versionsMatch) {
    return {
      detail: `Local CXSync app version is ${verification.local.version}; backend version is ${verification.cloud.version}. Update/restart the side that is behind before schema operations.`,
      title: "Application versions differ",
      tone: "warning" as const,
    }
  }
  return null
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

function isLocalHostName(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
}

function currentSnapshotFor(record: TenantConnection, snapshot: TenantCloudSnapshot | null) {
  if (!snapshot) return null
  return normalizeUrlForCompare(record.cloudApiUrl) === normalizeUrlForCompare(snapshot.apiUrl) ? snapshot : null
}

function normalizeUrlForCompare(value: string) {
  try {
    const parsed = new URL(value.trim())
    parsed.hash = ""
    parsed.search = ""
    return parsed.toString().replace(/\/+$/, "")
  } catch {
    return value.trim().replace(/\/+$/, "")
  }
}

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim()
}

function initials(value: string) {
  return value.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Operation failed."
}

async function loadTenantHandshakeHistory(id: string) {
  const client = connectionClient()
  if (typeof client.listTenantHandshakeHistory !== "function") return []
  return client.listTenantHandshakeHistory(id)
}

async function loadTenantCloudSnapshot(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantCloudSnapshot !== "function") return null
  return client.getTenantCloudSnapshot(id)
}

async function inspectTenantDatabase(id: string) {
  const client = connectionClient()
  if (typeof client.inspectTenantDatabase !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.inspectTenantDatabase(id)
}

async function loadTenantSchemaBaseline(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantSchemaBaseline !== "function") return null
  return client.getTenantSchemaBaseline(id)
}

async function loadCodebaseSchemaBuildStatus(id: string) {
  const client = connectionClient()
  if (typeof client.getCodebaseSchemaBuildStatus !== "function") {
    return {
      activity: ["Desktop bridge does not expose expected-schema build status."],
      database: null,
      elapsedMs: 0,
      error: null,
      message: "CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.",
      operation: null,
      phase: "failed" as const,
      processState: null,
      recentOutput: null,
      recentTables: [],
      startedAt: null,
      tableCount: 0,
      updatedAt: new Date().toISOString(),
    }
  }
  return client.getCodebaseSchemaBuildStatus(id)
}

async function loadTenantUpgradePlan(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantUpgradePlan !== "function") return null
  return client.getTenantUpgradePlan(id)
}

async function loadTenantUpgradePreflight(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantUpgradePreflight !== "function") return null
  return client.getTenantUpgradePreflight(id)
}

async function loadTenantUpgradeExecution(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantUpgradeExecution !== "function") return null
  return client.getTenantUpgradeExecution(id)
}

async function loadTenantSyncJob(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantSyncJob !== "function") return null
  return client.getTenantSyncJob(id)
}

async function loadTenantSyncJobs(id: string) {
  const client = connectionClient()
  if (typeof client.listTenantSyncJobs !== "function") return []
  return client.listTenantSyncJobs(id)
}

async function loadTenantBackup(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantBackup !== "function") return null
  return client.getTenantBackup(id)
}

async function loadServiceKeyStatus() {
  const client = connectionClient()
  if (typeof client.getServiceKeyStatus !== "function") {
    throw new Error("Cloud service settings are not available in this running desktop window. Close CXSync fully and start it again once.")
  }
  return client.getServiceKeyStatus()
}

async function loadOptionalServiceKeyStatus() {
  const client = connectionClient()
  if (typeof client.getServiceKeyStatus !== "function") {
    return {
      notice: "Cloud key bridge needs desktop restart",
      status: null,
    }
  }
  try {
    return {
      notice: "",
      status: await client.getServiceKeyStatus(),
    }
  } catch (reason) {
    return {
      notice: messageOf(reason),
      status: null,
    }
  }
}

async function loadOptionalCloudServiceHandshake() {
  const client = connectionClient()
  if (typeof client.getCloudServiceHandshake !== "function") return null
  try {
    return client.getCloudServiceHandshake()
  } catch {
    return null
  }
}

async function fetchLatestCloudHandshake(apiBase: string): Promise<CxSyncCloudServiceHandshake | null> {
  const response = await fetch(`${apiBase}/api/v1/cxsync-cloud/handshake`, { credentials: "include", headers: cxSyncCloudBrowserHeaders() })
  if (!response.ok) {
    throw new Error(`Latest handshake endpoint returned HTTP ${response.status}.`)
  }
  const body = await response.json().catch(() => null) as { handshake?: { apiUrl?: string; checkedAt?: string; latencyMs?: number; message?: string; ok?: boolean; payload?: Partial<CxSyncCloudServiceHandshake>; service?: string; status?: string } | null } | null
  const record = body?.handshake
  if (!record) return null
  const payload = record.payload ?? {}
  return {
    apiUrl: payload.apiUrl || record.apiUrl || apiBase,
    backend: payload.backend ?? { latencyMs: Number(record.latencyMs ?? 0), message: record.message || "Cloud backend accepted the desktop request.", ok: Boolean(record.ok), statusCode: 200 },
    checkedAt: payload.checkedAt || record.checkedAt || new Date().toISOString(),
    frontend: payload.frontend ?? { latencyMs: 0, message: "Base URL reachability was recorded by desktop.", ok: Boolean(record.ok), statusCode: null },
    latencyMs: Number(payload.latencyMs ?? record.latencyMs ?? 0),
    message: payload.message || record.message || "Cloud service accepted the desktop handshake.",
    ok: Boolean(payload.ok ?? record.ok),
    service: payload.service || record.service || "cxsync-cloud",
    status: cloudHandshakeStatus(payload.status || record.status),
  }
}

async function loadTenantServiceTenants(): Promise<CxSyncMasterTenant[]> {
  const status = await connectionClient().getServiceKeyStatus()
  const apiBase = normalizeCloudUrlInput(status.cloudServiceUrl || "")
  try {
    const response = await fetch(`${apiBase}/api/v1/cxsync-cloud/tenants`, { credentials: "include", headers: cxSyncCloudBrowserHeaders() })
    const body = await response.json().catch(() => null) as { error?: string; tenants?: CxSyncMasterTenant[] } | null
    if (!response.ok) throw new Error(response.status === 401 ? "Cloud admin session expired. Sign out and sign in again." : body?.error || `Tenant service returned HTTP ${response.status}.`)
    return body?.tenants ?? []
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new Error(`CXSync Cloud backend is not reachable at ${apiBase}. Start it with npm run dev:cxsync, then click Refresh.`)
    }
    throw reason
  }
}

async function verifyCloudServiceHandshake() {
  const client = connectionClient()
  if (typeof client.verifyCloudServiceHandshake !== "function") {
    throw new Error("Cloud handshake is not available in this running desktop window. Close CXSync fully and start it again once.")
  }
  return client.verifyCloudServiceHandshake()
}

async function generateCxSyncServiceKey() {
  const client = connectionClient()
  if (typeof client.generateServiceKey !== "function") {
    throw new Error("Service key generation is not available in this running desktop window. Close CXSync fully and start it again once.")
  }
  return client.generateServiceKey()
}

async function saveCxSyncServiceKey(key: string) {
  const client = connectionClient()
  if (typeof client.saveServiceKey !== "function") {
    throw new Error("Service key saving is not available in this running desktop window. Close CXSync fully and start it again once.")
  }
  return client.saveServiceKey(key)
}

async function saveCxSyncCloudServiceUrl(url: string) {
  const client = connectionClient()
  if (typeof client.saveCloudServiceUrl !== "function") {
    throw new Error("Cloud URL saving is not available in this running desktop window. Close CXSync fully and start it again once.")
  }
  return client.saveCloudServiceUrl(url)
}

async function executeTenantSyncJob(id: string) {
  const client = connectionClient()
  if (typeof client.runTenantSyncJob !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.runTenantSyncJob(id)
}

async function retryTenantSyncJob(id: string) {
  const client = connectionClient()
  if (typeof client.retryTenantSyncJob !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.retryTenantSyncJob(id)
}

async function continueTenantSyncJob(id: string) {
  const client = connectionClient()
  if (typeof client.continueTenantSyncJob !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.continueTenantSyncJob(id)
}

async function checkTenantSyncService(id: string) {
  const client = connectionClient()
  if (typeof client.checkTenantSyncService !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.checkTenantSyncService(id)
}

async function exportTenantSyncReport(id: string) {
  const client = connectionClient()
  if (typeof client.exportTenantSyncReport !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.exportTenantSyncReport(id)
}

async function captureTenantCloudSnapshot(id: string) {
  const client = connectionClient()
  if (typeof client.captureTenantCloudSnapshot !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.captureTenantCloudSnapshot(id)
}

async function createTenantUpgradePlan(id: string) {
  const client = connectionClient()
  if (typeof client.generateTenantUpgradePlan !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.generateTenantUpgradePlan(id)
}

async function executeTenantUpgradePreflight(id: string) {
  const client = connectionClient()
  if (typeof client.runTenantUpgradePreflight !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.runTenantUpgradePreflight(id)
}

async function createTenantRecoveryBackup(id: string) {
  const client = connectionClient()
  if (typeof client.createTenantBackup !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.createTenantBackup(id)
}

async function executeTenantUpgrade(id: string) {
  const client = connectionClient()
  if (typeof client.executeTenantUpgrade !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.executeTenantUpgrade(id)
}

async function captureTenantSchemaBaseline(id: string) {
  const client = connectionClient()
  if (typeof client.captureTenantSchemaBaseline !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.captureTenantSchemaBaseline(id)
}

async function captureCodebaseSchemaBaseline(id: string) {
  const client = connectionClient()
  if (typeof client.captureCodebaseSchemaBaseline !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.captureCodebaseSchemaBaseline(id)
}

async function compareTenantSchema(id: string) {
  const client = connectionClient()
  if (typeof client.compareTenantSchema !== "function") {
    throw new Error("CXSync desktop bridge is not updated. Close CXSync fully and run npm run dev:cxsync again.")
  }
  return client.compareTenantSchema(id)
}

function connectionAttention(record: TenantConnection) {
  const result = record.lastHandshake
  if (!result) return { action: "Handshake has not been run", label: "Not checked", tone: "unchecked" as const }
  if (!result.local.ok && !result.cloud.ok) return { action: "Check local and cloud credentials", label: "Connections failed", tone: "error" as const }
  if (!result.local.ok) return { action: "Check local database access", label: "Local failed", tone: "error" as const }
  if (!result.cloud.ok) return { action: "Check cloud URL or admin credentials", label: "Cloud failed", tone: "error" as const }
  if (!result.versionsMatch) return { action: `Update cloud or local version (${result.local.version} / ${result.cloud.version})`, label: "Version mismatch", tone: "attention" as const }
  return { action: "No action required", label: "Healthy", tone: "healthy" as const }
}

function formatCheckedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Last check unavailable"
  return `Checked ${date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let next = value
  let unit = 0
  while (next >= 1024 && unit < units.length - 1) {
    next /= 1024
    unit += 1
  }
  return `${next.toFixed(next >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function formatTimeOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "unknown"
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatElapsed(value: number) {
  const seconds = Math.max(0, Math.floor(value / 1000))
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return minutes ? `${minutes}m ${String(remaining).padStart(2, "0")}s` : `${remaining}s`
}

function formatEndpointStatus(endpoint?: { ok: boolean; statusCode: number | null } | null) {
  if (!endpoint) return "Not checked"
  return `${endpoint.ok ? "connected" : "failed"}${endpoint.statusCode ? ` · HTTP ${endpoint.statusCode}` : ""}`
}

function cloudHandshakeStatus(value: unknown): CxSyncCloudServiceHandshake["status"] {
  return value === "accepted" || value === "missing-key" || value === "missing-url" || value === "rejected" || value === "unreachable"
    ? value
    : "unreachable"
}

function normalizeCloudUrlInput(value: string) {
  const normalized = value.trim().replace(/\/+$/, "")
  const parsed = new URL(normalized)
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Cloud service URL must start with http:// or https://.")
  return parsed.toString().replace(/\/+$/, "")
}

function executionStatusLabel(status: TenantUpgradeExecution["status"]) {
  return ({
    blocked: "Execution blocked",
    completed: "Execution completed",
    "completed-with-skips": "Execution completed with skips",
    failed: "Execution failed",
    running: "Execution running",
  } satisfies Record<TenantUpgradeExecution["status"], string>)[status]
}

function executionBlockReason(plan: TenantUpgradePlan | null, preflight: TenantUpgradePreflight | null, backup: TenantBackupRecord | null, executableSteps: number) {
  if (!plan) return "Generate an upgrade plan before execution."
  if (!executableSteps) return "No executable safe/caution SQL steps are available in this plan."
  if (!preflight || preflight.planId !== plan.id) return "Run preflight for the current upgrade plan before execution."
  if (!preflight.ready) return `Preflight is blocking execution: ${preflight.summary.blocked} blocked check(s), ${preflight.summary.warnings} warning(s).`
  if (!backup || backup.planId !== plan.id) return "Create a restore-tested backup for the current plan before execution."
  if (backup.status !== "restore-verified") return "Backup exists but is not restore-verified yet. Create backup again or fix restore verification."
  return ""
}
