import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Clock3,
  Database,
  History,
  LoaderCircle,
  MonitorCog,
  Plus,
  RefreshCw,
  Server,
  Table2,
  Trash2,
} from "lucide-react"
import { AnimatedTabs, DashboardShell, getCxDesignSystem, type DashboardShellNavGroup } from "@cxsun/ui"
import type { AuthSession } from "../auth/auth-client"
import type {
  LocalEnvironmentStatus,
  TenantCloudSnapshot,
  TenantConnection,
  TenantDatabaseInspection,
  TenantHandshakeHistoryItem,
  TenantConnectionInput,
  TenantConnectionVerification,
  TenantSchemaBaseline,
  TenantSchemaBuildStatus,
  TenantSchemaDiffResult,
  TenantUpgradePlan,
  TenantUpgradePreflight,
  TenantUpgradeExecution,
  TenantBackupRecord,
} from "../../shared/connection-contracts"
import { connectionClient } from "../connections/connection-client"

type Page = "connections" | "add" | "show" | "local"

const navGroups: Array<DashboardShellNavGroup<Page>> = [
  {
    id: "workspace",
    items: [
      { icon: Server, id: "connections", label: "Tenant connections" },
      { icon: Plus, id: "add", label: "Add tenant" },
      { icon: Database, id: "local", label: "Local environment" },
    ],
    label: "Workspace",
    standalone: true,
  },
]

const titles: Record<Page, string> = {
  add: "Add tenant connection",
  connections: "Tenant connections",
  local: "Local environment",
  show: "Tenant connection",
}

const design = getCxDesignSystem("blue")

export function WorkspaceShell({ onLogout, session }: { onLogout(): void; session: AuthSession }) {
  const [page, setPage] = useState<Page>("connections")
  const [selectedId, setSelectedId] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

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
      navGroups={navGroups}
      navStyle={design.navStyle}
      onHome={() => setPage("connections")}
      onLogout={onLogout}
      onNavigate={setPage}
      title={titles[page]}
      tone={design.tone}
      user={{ displayName: session.name, email: session.email, roleLabel: session.role }}
      version="1.0.123"
    >
      {page === "connections" ? <ConnectionList key={refreshKey} onAdd={() => setPage("add")} onOpen={openConnection} /> : null}
      {page === "add" ? <ConnectionForm onCancel={() => setPage("connections")} onSaved={(record) => { setRefreshKey((value) => value + 1); openConnection(record.id) }} /> : null}
      {page === "show" ? <ConnectionShow id={selectedId} onBack={() => setPage("connections")} onDeleted={() => { setRefreshKey((value) => value + 1); setPage("connections") }} /> : null}
      {page === "local" ? <LocalEnvironmentPage /> : null}
    </DashboardShell>
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

function ConnectionForm({ onCancel, onSaved }: { onCancel(): void; onSaved(record: TenantConnection): void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const data = new FormData(event.currentTarget)
    try {
      onSaved(await connectionClient().saveTenantConnection(readTenantInput(data)))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="workspace-panel tenant-form" onSubmit={submit}>
      <header><small>New registry entry</small><h2>Add tenant connection</h2><p>Store tenant-local and cloud connection information. Passwords are encrypted by Windows.</p></header>
      <FormSection icon={<Server size={19} />} title="Tenant">
        <Field label="Tenant name"><input name="tenantName" required /></Field>
        <Field label="Tenant code"><input name="tenantCode" required /></Field>
        <Field label="Corporate ID"><input name="corporateId" required /></Field>
      </FormSection>
      <FormSection icon={<Database size={19} />} title="Local tenant database">
        <Field label="Host"><input defaultValue="127.0.0.1" name="localHost" required /></Field>
        <Field label="Port"><input defaultValue="3306" max="65535" min="1" name="localPort" required type="number" /></Field>
        <Field label="Database"><input name="localDatabase" required /></Field>
        <Field label="User"><input defaultValue="root" name="localUser" required /></Field>
        <Field label="Password"><input autoComplete="new-password" name="localPassword" required type="password" /></Field>
      </FormSection>
      <FormSection icon={<Cloud size={19} />} title="Cloud portal">
        <Field label="API URL"><input name="cloudApiUrl" placeholder="https://portal.example.com" required type="url" /></Field>
        <Field label="Login domain"><input name="cloudDomain" placeholder="client.example.com" required /></Field>
        <Field label="Admin email"><input name="cloudAdminEmail" required type="email" /></Field>
        <Field label="Admin password"><input autoComplete="new-password" name="cloudAdminPassword" required type="password" /></Field>
      </FormSection>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      <footer className="form-footer">
        <button className="secondary-button" onClick={onCancel} type="button">Cancel</button>
        <button className="primary-button" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Save tenant</button>
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
  const [loading, setLoading] = useState(true)
  const [capturingBaseline, setCapturingBaseline] = useState(false)
  const [capturingCodebaseBaseline, setCapturingCodebaseBaseline] = useState(false)
  const [capturingCloudSnapshot, setCapturingCloudSnapshot] = useState(false)
  const [comparingSchema, setComparingSchema] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [generatingUpgradePlan, setGeneratingUpgradePlan] = useState(false)
  const [runningPreflight, setRunningPreflight] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [executingUpgrade, setExecutingUpgrade] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [upgradeActionMessage, setUpgradeActionMessage] = useState("")
  const [error, setError] = useState("")

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
    ])
      .then(([next, nextHistory, nextCloudSnapshot, nextBaseline, nextUpgradePlan, nextPreflight, nextExecution, nextBackup]) => {
        setRecord(next)
        setVerification(next?.lastHandshake ?? null)
        setHistory(nextHistory)
        setCloudSnapshot(nextCloudSnapshot)
        setSchemaBaseline(nextBaseline)
        setUpgradePlan(nextUpgradePlan)
        setUpgradePreflight(nextPreflight)
        setUpgradeExecution(nextExecution)
        setTenantBackup(nextBackup)
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
    setCapturingCloudSnapshot(true)
    setError("")
    try {
      setCloudSnapshot(await captureTenantCloudSnapshot(id))
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setCapturingCloudSnapshot(false)
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

  async function remove() {
    if (!window.confirm("Delete this tenant connection?")) return
    await connectionClient().deleteTenantConnection(id)
    onDeleted()
  }

  if (loading) return <LoadingLine />
  if (!record) return <section className="workspace-panel"><button className="link-button" onClick={onBack} type="button"><ArrowLeft size={15} />Back</button><p>Tenant connection not found.</p></section>

  return (
    <div className="workspace-stack">
      <section className="workspace-panel">
        <header className="panel-heading-row">
          <div><button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} />Connections</button><h2>{record.tenantName}</h2><p>{record.tenantCode} · {record.corporateId}</p></div>
          <div className="sync-actions">
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
            content: <TenantOverview record={record} verification={verification} />,
            label: "Overview",
            value: "overview",
          },
          {
            content: <HandshakeHistory history={history} />,
            label: `Handshake history${history.length ? ` (${history.length})` : ""}`,
            value: "history",
          },
          {
            content: <CloudSnapshotPanel capturing={capturingCloudSnapshot} onCapture={captureCloudSnapshot} snapshot={cloudSnapshot} />,
            label: cloudSnapshot ? `Cloud snapshot (${cloudSnapshot.status})` : "Cloud snapshot",
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
        ]}
      />
    </div>
  )
}

function TenantOverview({ record, verification }: { record: TenantConnection; verification: TenantConnectionVerification | null }) {
  return (
    <div className="workspace-stack">
      <section className="workspace-panel">
        <header><small>Tenant access</small><h2>Connection overview</h2></header>
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
      {verification ? <VersionComparison verification={verification} /> : <section className="workspace-panel"><div className="empty-mini">Run handshake to compare local and cloud status.</div></section>}
    </div>
  )
}

function VersionComparison({ verification }: { verification: TenantConnectionVerification }) {
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

function CloudSnapshotPanel({ capturing, onCapture, snapshot }: { capturing: boolean; onCapture(): void; snapshot: TenantCloudSnapshot | null }) {
  return (
    <section className="workspace-panel">
      <header className="panel-heading-row">
        <div><small>Backend API evidence</small><h2>Cloud snapshot</h2><p>Captures tenant admin login, session token, and cloud health through the portal API. No direct VPS database access.</p></div>
        <button className="primary-button" disabled={capturing} onClick={onCapture} type="button">{capturing ? <LoaderCircle className="spin" size={17} /> : <Cloud size={17} />}{capturing ? "Capturing..." : "Capture cloud snapshot"}</button>
      </header>
      {!snapshot ? <div className="empty-mini">Capture the first cloud snapshot to save current portal reachability and version evidence.</div> : (
        <>
          <div className="connection-summary">
            <SummaryItem icon={<Cloud size={18} />} label="Snapshot status" tone={snapshot.status === "ready" ? "healthy" : "attention"} value={snapshot.status} />
            <SummaryItem icon={<Activity size={18} />} label="Cloud version" tone={snapshot.cloudVersion === "unavailable" ? "attention" : "neutral"} value={snapshot.cloudVersion} />
            <SummaryItem icon={<Clock3 size={18} />} label="Captured" value={formatShortDate(snapshot.capturedAt)} />
          </div>
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
          </div>
          <div className={`cloud-snapshot-message cloud-snapshot-message--${snapshot.status}`}>
            {snapshot.status === "ready" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <div><strong>{snapshot.message}</strong><small>{formatCheckedAt(snapshot.capturedAt)}{snapshot.session.selectedTenant ? ` · selected tenant ${snapshot.session.selectedTenant}` : ""}</small></div>
          </div>
        </>
      )}
    </section>
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
        <div><small>Schema baseline</small><h2>Schema diff</h2><p>Build the expected schema in an isolated temporary database, then compare every local table, column, and index.</p></div>
        <div className="sync-actions">
          <button className="secondary-button" disabled={capturing || capturingCodebase || comparing} onClick={onCapture} type="button">{capturing ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />}Set from local</button>
          <button className="secondary-button" disabled={capturing || capturingCodebase || comparing} onClick={onCaptureCodebase} type="button">{capturingCodebase ? <LoaderCircle className="spin" size={17} /> : <Server size={17} />}{capturingCodebase ? `Building... ${formatElapsed(buildStatus?.elapsedMs ?? 0)}` : "Build expected schema"}</button>
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
      {!baseline ? <div className="empty-mini">No active baseline yet. Build the expected schema from the checked-out backend migrations first.</div> : (
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
      {!plan ? <div className="empty-mini">Build the expected schema, then generate a reviewable tenant upgrade plan.</div> : (
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

function LocalEnvironmentPage() {
  const [status, setStatus] = useState<LocalEnvironmentStatus | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    connectionClient().getLocalEnvironmentStatus().then(setStatus).catch((reason) => setError(messageOf(reason)))
  }, [])

  return (
    <section className="workspace-panel">
      <header><small>Dedicated CXSync storage</small><h2>Local CXSync environment</h2><p>Configuration, handshake history, analytics, and snapshots stay outside the platform master database.</p></header>
      {error ? <div className="form-message form-message--error">{error}</div> : null}
      {!status && !error ? <LoadingLine /> : null}
      {status ? (
        <div className="detail-grid">
          <DetailCard icon={<Database size={19} />} title="CXSync MariaDB">
            <Detail label="Server" value={`${status.host}:${status.port}`} />
            <Detail label="Database" value={status.database} />
            <Detail label="User" value={status.user} />
          </DetailCard>
          <DetailCard icon={<Activity size={19} />} title="Versions">
            <Detail label="CXSync" value={status.appVersion} />
            <Detail label="MariaDB" value={status.databaseServerVersion} />
            <Detail label="Status" value={status.ok ? "Connected" : "Unavailable"} />
          </DetailCard>
        </div>
      ) : null}
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

async function loadTenantBackup(id: string) {
  const client = connectionClient()
  if (typeof client.getTenantBackup !== "function") return null
  return client.getTenantBackup(id)
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
