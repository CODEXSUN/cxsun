import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Database, LoaderCircle, Pause, Play, RefreshCw, Server, Square } from "lucide-react"
import type { MirrorFullSyncJob, MirrorFullSyncQueue, MirrorIncrementalSyncJob, MirrorIncrementalSyncQueue, MirrorSchedule, TenantConnection } from "../../shared/connection-contracts"
import { connectionClient, cxSyncCloudBrowserHeaders, cxSyncCloudBrowserUrl } from "../connections/connection-client"

type MirrorStatus = {
  cursorCount: number
  enabled: boolean
  jobCount: number
  lastJobStatus: string | null
  mode: "foundation-ready"
  nextStep: string
}

export function MirrorPage() {
  return connectionClient().isDesktop ? <DesktopMirrorDesk /> : <CloudMirrorStatusPage />
}

function DesktopMirrorDesk() {
  const [connections, setConnections] = useState<TenantConnection[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [fullHistory, setFullHistory] = useState<MirrorFullSyncJob[]>([])
  const [incrementalHistory, setIncrementalHistory] = useState<MirrorIncrementalSyncJob[]>([])
  const [schedule, setSchedule] = useState<MirrorSchedule | null>(null)
  const [fullQueue, setFullQueue] = useState<MirrorFullSyncQueue | null>(null)
  const [incrementalQueue, setIncrementalQueue] = useState<MirrorIncrementalSyncQueue | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!fullQueue || fullQueue.status !== "running") return
    const timer = window.setInterval(() => {
      void connectionClient().getMirrorFullSyncQueue(fullQueue.id).then((next) => {
        if (next) {
          setFullQueue(next)
          setFullHistory((items) => mergeJobs(next.items, items))
        }
        if (next && next.status !== "running") setRunning(false)
      }).catch((reason) => { setError(messageOf(reason)); setRunning(false) })
    }, 2000)
    return () => window.clearInterval(timer)
  }, [fullQueue])

  useEffect(() => {
    if (!incrementalQueue || (incrementalQueue.status !== "running" && incrementalQueue.status !== "paused")) return
    const timer = window.setInterval(() => {
      void connectionClient().getMirrorIncrementalSyncQueue(incrementalQueue.id).then((next) => {
        if (next) {
          setIncrementalQueue(next)
          setIncrementalHistory((items) => mergeJobs(next.items, items))
        }
        if (next && next.status !== "running" && next.status !== "paused") setRunning(false)
      }).catch((reason) => { setError(messageOf(reason)); setRunning(false) })
    }, 2000)
    return () => window.clearInterval(timer)
  }, [incrementalQueue])

  async function load() {
    setLoading(true)
    setError("")
    try {
      const [items, full, incremental, mirrorSchedule] = await Promise.all([
        connectionClient().listTenantConnections(),
        connectionClient().listMirrorFullSyncJobs(),
        connectionClient().listMirrorIncrementalSyncJobs(),
        connectionClient().getMirrorSchedule(),
      ])
      setConnections(items)
      setFullHistory(full)
      setIncrementalHistory(incremental)
      setSchedule(mirrorSchedule)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setLoading(false)
    }
  }

  async function startFullAll() {
    setRunning(true)
    setError("")
    try {
      setFullQueue(await connectionClient().startMirrorFullSyncQueue(connections.map((item) => item.id)))
    } catch (reason) {
      setError(messageOf(reason))
      setRunning(false)
    }
  }

  async function startOrResumeIncrementalAll() {
    setRunning(true)
    setError("")
    try {
      if (incrementalQueue?.status === "paused") {
        const next = await connectionClient().resumeMirrorIncrementalSyncQueue(incrementalQueue.id)
        if (next) setIncrementalQueue(next)
      } else {
        setIncrementalQueue(await connectionClient().startMirrorIncrementalSyncQueue(connections.map((item) => item.id)))
      }
    } catch (reason) {
      setError(messageOf(reason))
      setRunning(false)
    }
  }

  async function pauseIncrementalAll() {
    setError("")
    try {
      if (!incrementalQueue) return
      const next = await connectionClient().pauseMirrorIncrementalSyncQueue(incrementalQueue.id)
      if (next) setIncrementalQueue(next)
      setRunning(false)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  async function stopIncrementalAll() {
    setError("")
    try {
      if (!incrementalQueue) return
      const next = await connectionClient().stopMirrorIncrementalSyncQueue(incrementalQueue.id)
      if (next) {
        setIncrementalQueue(next)
        setIncrementalHistory((items) => mergeJobs(next.items, items))
      }
      setRunning(false)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  function updateFullJob(job: MirrorFullSyncJob) {
    setFullHistory((items) => mergeJobs([job], items))
  }

  function updateIncrementalJob(job: MirrorIncrementalSyncJob) {
    setIncrementalHistory((items) => mergeJobs([job], items))
  }

  const selected = connections.find((item) => item.id === selectedId) ?? null
  const incrementalActive = incrementalQueue?.status === "running" || incrementalQueue?.status === "paused"
  const incrementalPaused = incrementalQueue?.status === "paused"
  const liveStatus = incrementalQueue?.status === "running" || fullQueue?.status === "running"
    ? "running"
    : incrementalQueue?.status === "paused"
      ? "paused"
      : incrementalQueue?.status === "stopped" || fullQueue?.status === "stopped"
        ? "stopped"
        : "idle"
  const tenantProgress = connections.map((connection) => tenantMirrorProgress(
    connection,
    latestFor(fullHistory, connection.id),
    latestFor(incrementalHistory, connection.id),
    incrementalQueue?.items.find((item) => item.tenantConnectionId === connection.id),
    incrementalQueue?.status,
  ))
  if (selected) {
    return <MirrorShowPage
      connection={selected}
      fullHistory={fullHistory.filter((item) => item.tenantConnectionId === selected.id)}
      incrementalHistory={incrementalHistory.filter((item) => item.tenantConnectionId === selected.id)}
      onBack={() => setSelectedId("")}
      onError={setError}
      onFullJob={updateFullJob}
      onIncrementalJob={updateIncrementalJob}
      running={running}
      setRunning={setRunning}
    />
  }

  return <section className="workspace-panel page-surface page-surface--cloud mirror-desk">
    <header className="panel-heading-row">
      <div>
        <small>CXSync Mirror</small>
        <h2>Mirror tenants</h2>
        <p>Office cloud → local mirror.</p>
        <div className="mirror-status-strip">
          <MirrorStatusChip label="Now" status={liveStatus} value={liveStatus} />
          <MirrorStatusChip label="Schedule" status={schedule?.enabled ? "scheduled" : "idle"} value={schedule?.enabled ? `${schedule.mode} ${schedule.time}` : "off"} />
        </div>
      </div>
      <div className="mirror-control-buttons mirror-control-buttons--top">
        <button className="secondary-button" disabled={Boolean(incrementalActive) || running || !connections.length} onClick={() => void startFullAll()} type="button"><Server size={16} />Full</button>
        <button className="primary-button" disabled={(Boolean(incrementalActive) && !incrementalPaused) || !connections.length} onClick={() => void startOrResumeIncrementalAll()} type="button">{incrementalPaused ? <Play size={16} /> : <RefreshCw size={16} />}Start</button>
        <button className="secondary-button" disabled={incrementalQueue?.status !== "running"} onClick={() => void pauseIncrementalAll()} type="button"><Pause size={16} />Pause</button>
        <button className="secondary-button" disabled={!incrementalActive} onClick={() => void stopIncrementalAll()} type="button"><Square size={16} />Stop</button>
        <button className="secondary-button" disabled={loading} onClick={() => void load()} type="button">{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
      </div>
    </header>

    {error ? <div className="form-message form-message--error">{error}</div> : null}

    {fullQueue ? <QueueCard icon={<Server size={18} />} label="Full sync queue" queue={fullQueue} /> : null}
    {incrementalQueue ? <QueueCard icon={<Database size={18} />} label="Incremental queue" queue={incrementalQueue} /> : null}

    <div className="mirror-tenant-table">
      <div className="mirror-tenant-table__head">
        <span>Tenant</span>
        <span>DB</span>
        <span>Full</span>
        <span>Incr</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      {connections.map((connection) => <MirrorTenantCard
        connection={connection}
        full={latestFor(fullHistory, connection.id)}
        incremental={latestFor(incrementalHistory, connection.id)}
        key={connection.id}
        onOpen={() => setSelectedId(connection.id)}
        progress={tenantProgress.find((item) => item.id === connection.id)}
      />)}
    </div>
    {!loading && !connections.length ? <div className="empty-mini">No tenant connections saved yet. Add tenants from the Sync desk first.</div> : null}
  </section>
}

export function MirrorSettingsPage() {
  const [schedule, setSchedule] = useState<MirrorSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError("")
    setNotice("")
    try {
      setSchedule(await connectionClient().getMirrorSchedule())
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setLoading(false)
    }
  }

  async function saveSchedule(next: MirrorSchedule) {
    setSaving(true)
    setError("")
    setNotice("")
    try {
      setSchedule(await connectionClient().saveMirrorSchedule(next))
      setNotice("Mirror schedule saved.")
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  return <section className="workspace-panel page-surface page-surface--cloud mirror-desk">
    <header className="panel-heading-row">
      <div>
        <small>CXSync Mirror / Settings</small>
        <h2>Mirror settings</h2>
        <p>Configure the daily online-to-offline mirror schedule separately from live sync controls.</p>
      </div>
      <button className="secondary-button" disabled={loading} onClick={() => void load()} type="button">{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
    </header>
    {error ? <div className="form-message form-message--error">{error}</div> : null}
    {notice ? <div className="form-message form-message--success">{notice}</div> : null}
    {loading && !schedule ? <div className="form-message"><LoaderCircle className="spin" size={16} />Loading schedule...</div> : null}
    {schedule ? <ScheduleCard disabled={saving} onSave={saveSchedule} schedule={schedule} setSchedule={setSchedule} /> : null}
  </section>
}

function MirrorShowPage({ connection, fullHistory, incrementalHistory, onBack, onError, onFullJob, onIncrementalJob, running, setRunning }: {
  connection: TenantConnection
  fullHistory: MirrorFullSyncJob[]
  incrementalHistory: MirrorIncrementalSyncJob[]
  onBack(): void
  onError(message: string): void
  onFullJob(job: MirrorFullSyncJob): void
  onIncrementalJob(job: MirrorIncrementalSyncJob): void
  running: boolean
  setRunning(value: boolean): void
}) {
  const [targetDatabase, setTargetDatabase] = useState(defaultMirrorDatabase(connection.tenantCode))
  const [fullJob, setFullJob] = useState<MirrorFullSyncJob | null>(null)
  const [incrementalJob, setIncrementalJob] = useState<MirrorIncrementalSyncJob | null>(null)
  const safeTarget = /^cxmirror_[A-Za-z0-9_]{1,55}$/.test(targetDatabase.trim())

  useEffect(() => {
    setTargetDatabase(defaultMirrorDatabase(connection.tenantCode))
    setFullJob(null)
    setIncrementalJob(null)
  }, [connection.id, connection.tenantCode])

  useEffect(() => {
    if (!fullJob || fullJob.status !== "running") return
    const timer = window.setInterval(() => {
      void connectionClient().getMirrorFullSyncJob(fullJob.id).then((next) => {
        if (next) {
          setFullJob(next)
          onFullJob(next)
        }
        if (next && next.status !== "running") setRunning(false)
      }).catch((reason) => { onError(messageOf(reason)); setRunning(false) })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [fullJob, onError, onFullJob, setRunning])

  useEffect(() => {
    if (!incrementalJob || incrementalJob.status !== "running") return
    const timer = window.setInterval(() => {
      void connectionClient().getMirrorIncrementalSyncJob(incrementalJob.id).then((next) => {
        if (next) {
          setIncrementalJob(next)
          onIncrementalJob(next)
        }
        if (next && next.status !== "running") setRunning(false)
      }).catch((reason) => { onError(messageOf(reason)); setRunning(false) })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [incrementalJob, onError, onIncrementalJob, setRunning])

  async function startFull() {
    setRunning(true)
    onError("")
    try {
      const next = await connectionClient().startMirrorFullSync(connection.id, targetDatabase)
      setFullJob(next)
      onFullJob(next)
    } catch (reason) {
      onError(messageOf(reason))
      setRunning(false)
    }
  }

  async function startIncremental() {
    setRunning(true)
    onError("")
    try {
      const next = await connectionClient().startMirrorIncrementalSync(connection.id, targetDatabase)
      setIncrementalJob(next)
      onIncrementalJob(next)
    } catch (reason) {
      onError(messageOf(reason))
      setRunning(false)
    }
  }

  return <section className="workspace-panel page-surface page-surface--cloud mirror-show">
    <button className="link-button" onClick={onBack} type="button"><ArrowLeft size={15} />Back to mirror tenants</button>
    <header className="panel-heading-row">
      <div>
        <small>CXSync Mirror / Tenant show</small>
        <h2>{connection.tenantName}</h2>
        <p>Tenant {connection.tenantCode} · local target must stay inside a dedicated <code>cxmirror_*</code> database.</p>
      </div>
    </header>

    <div className="mirror-show-grid">
      <section className="mirror-form-card">
        <h3>Mirror target</h3>
        <Field label="Local mirror database">
          <input disabled={running} onChange={(event) => setTargetDatabase(event.target.value)} value={targetDatabase} />
        </Field>
        <div className={`form-message ${safeTarget ? "form-message--success" : "form-message--error"}`}>{safeTarget ? "Safe target name accepted." : "Database name must start with cxmirror_ and contain only letters, numbers, underscores."}</div>
      </section>

      <section className="mirror-form-card">
        <h3>Actions</h3>
        <div className="cloud-connection-actions">
          <button className="primary-button" disabled={running || !safeTarget} onClick={() => void startFull()} type="button">{running ? <LoaderCircle className="spin" size={17} /> : <Server size={17} />}Full sync now</button>
          <button className="secondary-button" disabled={running || !safeTarget} onClick={() => void startIncremental()} type="button"><RefreshCw size={16} />Incremental sync now</button>
        </div>
        <small>Run full sync first. Incremental sync uses saved cursors and explicit tombstones for deletes.</small>
      </section>
    </div>

    <div className="form-message form-message--warning"><AlertTriangle size={16} />Full sync recreates only the selected local mirror database. Do not use a working tenant database as the target.</div>
    {fullJob ? <FullJobCard job={fullJob} /> : null}
    {incrementalJob ? <IncrementalJobCard job={incrementalJob} /> : null}

    <HistoryTable fullHistory={fullHistory} incrementalHistory={incrementalHistory} />
  </section>
}

function MirrorTenantCard({ connection, full, incremental, onOpen, progress }: { connection: TenantConnection; full?: MirrorFullSyncJob; incremental?: MirrorIncrementalSyncJob; onOpen(): void; progress?: ReturnType<typeof tenantMirrorProgress> }) {
  return <article className="mirror-tenant-card">
    <div className="mirror-tenant-main">
      <small>{connection.tenantCode}</small>
      <h3>{connection.tenantName}</h3>
    </div>
    <span className="mirror-table-value">{defaultMirrorDatabase(connection.tenantCode)}</span>
    <StatusPill status={full?.status || "idle"} text={full?.status || "none"} />
    <StatusPill status={incremental?.status || "idle"} text={incremental?.status || "none"} />
    <div className={`mirror-progress mirror-progress--${progress?.tone || "idle"}`}>
      <div><strong>{progress?.label || "Waiting"}</strong><small>{progress?.detail || "No mirror run yet"}</small><b>{progress?.percent ?? 0}%</b></div>
      <span><i style={{ width: `${progress?.percent ?? 0}%` }} /></span>
    </div>
    <div className="mirror-row-actions">
      <button className="primary-button" onClick={onOpen} type="button">Open</button>
    </div>
  </article>
}

function StatusPill({ status, text }: { status: string; text: string }) {
  const normalized = status === "not bootstrapped" || status === "not run" ? "idle" : status
  return <span className={`mirror-status-pill mirror-status-pill--${normalized}`}>
    {statusIcon(normalized)}
    {text}
  </span>
}

function MirrorStatusChip({ label, status, value }: { label: string; status: string; value: string }) {
  return <span className={`mirror-live-chip mirror-live-chip--${status}`}>
    {statusIcon(status)}
    <b>{label}</b>
    <strong>{value}</strong>
  </span>
}

function statusIcon(status: string) {
  if (status === "running") return <LoaderCircle className="spin" size={14} />
  if (status === "scheduled") return <Clock3 size={14} />
  if (status === "paused") return <Pause size={14} />
  if (status === "stopped") return <Square size={14} />
  if (status === "completed" || status === "done") return <CheckCircle2 size={14} />
  if (status === "failed" || status === "completed-with-errors") return <AlertTriangle size={14} />
  return <Clock3 size={14} />
}

function ScheduleCard({ disabled, onSave, schedule, setSchedule }: { disabled: boolean; onSave(schedule: MirrorSchedule): Promise<void>; schedule: MirrorSchedule; setSchedule(schedule: MirrorSchedule): void }) {
  const nextSchedule = { ...schedule, nextRunAt: schedule.nextRunAt }
  return <section className={`mirror-form-card mirror-schedule-card ${schedule.enabled ? "is-enabled" : ""}`}>
    <div className="panel-heading-row">
      <div><small>Upsert schedule</small><h3>Daily office mirror</h3><p>Create or update the one daily all-tenant Mirror schedule.</p></div>
      <label className="mirror-switch">
        <input checked={schedule.enabled} disabled={disabled} onChange={(event) => setSchedule({ ...schedule, enabled: event.target.checked, nextRunAt: null })} type="checkbox" />
        <span><i /></span>
        <b>{schedule.enabled ? "Enabled" : "Disabled"}</b>
      </label>
    </div>
    <div className="mirror-schedule-form">
      <Field label="Run time"><input disabled={disabled} onChange={(event) => setSchedule({ ...schedule, time: event.target.value, nextRunAt: null })} type="time" value={schedule.time} /></Field>
      <Field label="Mode"><select disabled={disabled} onChange={(event) => setSchedule({ ...schedule, mode: event.target.value === "incremental" ? "incremental" : "full", nextRunAt: null })} value={schedule.mode}><option value="full">Full bootstrap</option><option value="incremental">Incremental pull</option></select></Field>
    </div>
    <div className="mirror-schedule-summary">
      <span><strong>{schedule.enabled ? "Active" : "Paused"}</strong><small>Status</small></span>
      <span><strong>{schedule.mode === "incremental" ? "Incremental" : "Full"}</strong><small>Daily mode</small></span>
      <span><strong>{schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "After save"}</strong><small>Next run</small></span>
    </div>
    <button className="primary-button" disabled={disabled} onClick={() => void onSave(nextSchedule)} type="button">Upsert schedule</button>
  </section>
}

function QueueCard({ icon, label, queue }: { icon: ReactNode; label: string; queue: MirrorFullSyncQueue | MirrorIncrementalSyncQueue }) {
  const percent = queue.totalCount ? Math.round(((queue.completedCount + queue.failedCount) / queue.totalCount) * 100) : 0
  return <div className={`sql-dump-progress sql-dump-progress--${queue.status === "completed" ? "completed" : queue.status === "completed-with-errors" ? "failed" : ""}`}>
    <div className="sql-dump-progress-title">{icon}<div><strong>{label}: {queue.status}</strong><small>{queue.completedCount}/{queue.totalCount} completed · {queue.failedCount} failed</small></div><span>{queue.status}</span></div>
    <div className="sql-dump-progress-track"><span style={{ width: `${percent}%` }} /></div>
  </div>
}

function FullJobCard({ job }: { job: MirrorFullSyncJob }) {
  return <div className={`sql-dump-progress sql-dump-progress--${job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : ""}`}>
    <div className="sql-dump-progress-title"><Server size={18} /><div><strong>{job.status === "running" ? `Full sync: ${job.phase}` : `Full sync ${job.status}`}</strong><small>{job.sourceDatabase || "cloud"} → {job.localDatabase} · {job.tableCount} tables · {job.rowCount} rows · {formatBytes(job.downloadedBytes)}</small></div><span>{job.status}</span></div>
    {job.error ? <small>{job.error}</small> : null}
  </div>
}

function IncrementalJobCard({ job }: { job: MirrorIncrementalSyncJob }) {
  return <div className={`sql-dump-progress sql-dump-progress--${job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : ""}`}>
    <div className="sql-dump-progress-title"><Database size={18} /><div><strong>{job.status === "running" ? `Incremental: ${job.phase}` : `Incremental ${job.status}`}</strong><small>{job.localDatabase} · {job.tableCount} changed tables · {job.rowCount} upserted rows</small></div><span>{job.status}</span></div>
    {job.error ? <small>{job.error}</small> : null}
  </div>
}

function HistoryTable({ fullHistory, incrementalHistory }: { fullHistory: MirrorFullSyncJob[]; incrementalHistory: MirrorIncrementalSyncJob[] }) {
  const rows = useMemo(() => [
    ...fullHistory.map((item) => ({ id: item.id, kind: "Full", local: item.localDatabase, rows: item.rowCount, startedAt: item.startedAt, status: item.status, tables: item.tableCount })),
    ...incrementalHistory.map((item) => ({ id: item.id, kind: "Incremental", local: item.localDatabase, rows: item.rowCount, startedAt: item.startedAt, status: item.status, tables: item.tableCount })),
  ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 20), [fullHistory, incrementalHistory])
  if (!rows.length) return <div className="empty-mini">No mirror history for this tenant yet.</div>
  return <div className="tenant-service-list">
    <div className="tenant-service-list__head"><span>Started</span><span>Run</span><span>Status</span></div>
    {rows.map((item) => <article className="tenant-service-row" key={item.id}>
      <span><strong>{new Date(item.startedAt).toLocaleString()}</strong><small>{item.id.slice(0, 8)}</small></span>
      <span><small>{item.kind}</small><strong>{item.local}</strong></span>
      <span><strong>{item.status}</strong><small>{item.tables} tables · {item.rows} rows</small></span>
    </article>)}
  </div>
}

function CloudMirrorStatusPage() {
  const [status, setStatus] = useState<MirrorStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { void refresh() }, [])

  async function refresh() {
    setLoading(true)
    setError("")
    try {
      setStatus(await loadMirrorStatus())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mirror status failed.")
    } finally {
      setLoading(false)
    }
  }

  return <section className="workspace-panel page-surface page-surface--cloud">
    <header className="panel-heading-row">
      <div>
        <small>CXSync Mirror</small>
        <h2>Cloud to office local mirror</h2>
        <p>Cloud status for scheduled online-to-offline replication.</p>
      </div>
      <button className="secondary-button" disabled={loading} onClick={() => void refresh()} type="button">{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
    </header>

    {error ? <div className="form-message form-message--error">{error}</div> : null}
    {!status && loading ? <div className="form-message"><LoaderCircle className="spin" size={16} />Checking Mirror foundation...</div> : null}
    {status ? <>
      <div className="overview-status-grid">
        <Summary icon={<CheckCircle2 size={18} />} label="Foundation" value={status.mode === "foundation-ready" ? "Ready" : "Unknown"} />
        <Summary icon={<Clock3 size={18} />} label="Scheduler" value={status.enabled ? "Enabled" : "Not armed"} />
        <Summary icon={<Database size={18} />} label="Mirror jobs" value={String(status.jobCount)} />
        <Summary icon={<Server size={18} />} label="Cursors" value={String(status.cursorCount)} />
      </div>
      <div className="safe-note"><Server size={16} /><span>{status.nextStep} Last job status: {status.lastJobStatus || "none"}.</span></div>
    </> : !loading ? <div className="empty-mini">Mirror foundation is waiting for Cloud status.</div> : null}
  </section>
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="summary-item"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>
}

async function loadMirrorStatus() {
  const baseUrl = cxSyncCloudBrowserUrl() || window.location.origin
  const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/mirror/status`, { credentials: "include", headers: cxSyncCloudBrowserHeaders() })
  const body = await response.json().catch(() => null) as { error?: string; mirror?: MirrorStatus } | null
  if (!response.ok || !body?.mirror) throw new Error(body?.error || `Mirror status returned HTTP ${response.status}.`)
  return body.mirror
}

function defaultMirrorDatabase(tenantCode: string) {
  return `cxmirror_${tenantCode.replace(/[^A-Za-z0-9_]/g, "_")}`
}

function latestFor<T extends { startedAt: string; tenantConnectionId: string }>(items: T[], id: string) {
  return items.filter((item) => item.tenantConnectionId === id).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
}

function tenantMirrorProgress(connection: TenantConnection, full?: MirrorFullSyncJob, incremental?: MirrorIncrementalSyncJob, queued?: MirrorIncrementalSyncJob, queueStatus?: MirrorIncrementalSyncQueue["status"]) {
  const active = queued?.status === "running"
  const latest = queued ?? incremental ?? full
  if (queued?.status === "failed" || incremental?.status === "failed" || full?.status === "failed") {
    return { detail: latest?.error || "Open details", id: connection.id, label: "Failed", percent: 100, tone: "failed" as const }
  }
  if (active) {
    return { detail: queueStatus === "paused" ? "Paused" : "Queue", id: connection.id, label: queueStatus === "paused" ? "Paused" : "Syncing", percent: 55, tone: queueStatus === "paused" ? "paused" as const : "running" as const }
  }
  if (incremental?.status === "completed") {
    return { detail: `${incremental.tableCount} tables · ${incremental.rowCount} rows`, id: connection.id, label: "Synced", percent: 100, tone: "done" as const }
  }
  if (full?.status === "completed") {
    return { detail: `${full.tableCount} tables · ${full.rowCount} rows`, id: connection.id, label: "Cloned", percent: 100, tone: "done" as const }
  }
  if (full?.status === "running") {
    return { detail: full.phase, id: connection.id, label: "Full running", percent: 55, tone: "running" as const }
  }
  return { detail: "Full first", id: connection.id, label: "Not mirrored", percent: 0, tone: "idle" as const }
}

function mergeJobs<T extends { id: string }>(incoming: T[], existing: T[]) {
  return [...incoming, ...existing.filter((item) => !incoming.some((next) => next.id === item.id))].slice(0, 25)
}

function formatBytes(value: number) {
  if (!value) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1 }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Mirror request failed."
}
