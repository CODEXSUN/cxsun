import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowLeft, CheckCircle2, ChevronRight, Database, DatabaseBackup, FolderOpen, LoaderCircle, RefreshCw, Table2 } from "lucide-react"
import type { SqlDumpDatabase, SqlDumpQueue, SqlDumpServerCredentials, SqlDumpTable } from "../../shared/connection-contracts"
import { cxSyncCloudBrowserHeaders, cxSyncCloudBrowserUrl } from "../connections/connection-client"

const initialCredentials: SqlDumpServerCredentials = { host: "localhost", password: "", port: 3306, user: "root" }

export function SqlDumpPage() {
  const desktop = Boolean(window.cxsyncDesktop)
  const [credentials, setCredentials] = useState<SqlDumpServerCredentials>(initialCredentials)
  const [databases, setDatabases] = useState<SqlDumpDatabase[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [shownDatabase, setShownDatabase] = useState<SqlDumpDatabase | null>(null)
  const [tables, setTables] = useState<SqlDumpTable[]>([])
  const [destination, setDestination] = useState(desktop ? "" : "manual")
  const [queue, setQueue] = useState<SqlDumpQueue | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const queueActive = queue?.status === "queued" || queue?.status === "running"
  const allSelected = databases.length > 0 && selected.size === databases.length
  const shownSize = useMemo(() => tables.reduce((sum, table) => sum + table.sizeBytes, 0), [tables])

  useEffect(() => {
    if (!queueActive || !queue) return
    const timer = window.setInterval(() => { void refreshQueue(queue.id) }, 800)
    return () => window.clearInterval(timer)
  }, [queue?.id, queue?.status])

  async function connect(event?: FormEvent) {
    event?.preventDefault()
    setConnecting(true)
    setError("")
    setShownDatabase(null)
    setTables([])
    try {
      const result = desktop
        ? await window.cxsyncDesktop!.listSqlDumpDatabases(credentials)
        : (await cloudRequest<{ databases: SqlDumpDatabase[] }>("/api/v1/cxsync-cloud/sql-dumps/databases", jsonPost(credentials))).databases
      setDatabases(result)
      setSelected(new Set())
    } catch (reason) {
      setDatabases([])
      setSelected(new Set())
      setError(messageOf(reason))
    } finally {
      setConnecting(false)
    }
  }

  async function openDatabase(database: SqlDumpDatabase) {
    setShownDatabase(database)
    setLoadingDetails(true)
    setError("")
    try {
      const input = { ...credentials, database: database.name }
      const result = desktop
        ? await window.cxsyncDesktop!.inspectSqlDumpTables(input)
        : (await cloudRequest<{ tables: SqlDumpTable[] }>("/api/v1/cxsync-cloud/sql-dumps/tables", jsonPost(input))).tables
      setTables(result)
    } catch (reason) {
      setTables([])
      setError(messageOf(reason))
    } finally {
      setLoadingDetails(false)
    }
  }

  async function chooseDirectory() {
    const path = await window.cxsyncDesktop?.chooseSqlDumpDirectory()
    if (path) setDestination(path)
  }

  async function startQueue(databaseNames = [...selected]) {
    if (!databaseNames.length) return setError("Select at least one database for the dump queue.")
    if (!destination.trim()) return setError("Choose a dump destination first.")
    setStarting(true)
    setError("")
    try {
      const started = desktop
        ? await window.cxsyncDesktop!.startSqlDumpQueue(credentials, databaseNames, destination)
        : (await cloudRequest<{ queue: SqlDumpQueue }>("/api/v1/cxsync-cloud/sql-dumps/queues", jsonPost({ credentials, databases: databaseNames, folder: destination }))).queue
      setQueue(started)
      setShownDatabase(null)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setStarting(false)
    }
  }

  async function refreshQueue(id: string) {
    try {
      const current = desktop
        ? await window.cxsyncDesktop!.getSqlDumpQueue(id)
        : (await cloudRequest<{ queue: SqlDumpQueue }>(`/api/v1/cxsync-cloud/sql-dumps/queues/${id}`)).queue
      if (current) setQueue(current)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  function updateCredential<K extends keyof SqlDumpServerCredentials>(key: K, value: SqlDumpServerCredentials[K]) {
    setCredentials((current) => ({ ...current, [key]: value }))
    setDatabases([])
    setSelected(new Set())
    setShownDatabase(null)
  }

  function toggle(name: string) {
    setSelected((current) => { const next = new Set(current); next.has(name) ? next.delete(name) : next.add(name); return next })
  }

  return (
    <section className="workspace-panel page-surface sql-dump-page">
      <header className="panel-heading-row">
        <div><small>Database maintenance</small><h2>{shownDatabase ? shownDatabase.name : "SQL dump databases"}</h2><p>{shownDatabase ? "Review database tables and create a complete SQL dump." : "Connect to a MariaDB server, select user databases, and run full dumps in a serial queue."}</p></div>
        {shownDatabase ? <button className="secondary-button" onClick={() => { setShownDatabase(null); setTables([]) }} type="button"><ArrowLeft size={17} />Back to databases</button> : <DatabaseBackup size={28} />}
      </header>

      {error ? <div className="form-message form-message--error">{error}</div> : null}

      {!shownDatabase ? (
        <>
          <form className="sql-dump-credentials sql-dump-credentials--server" onSubmit={connect}>
            <label><span>Host</span><input onChange={(event) => updateCredential("host", event.target.value)} required value={credentials.host} /></label>
            <label><span>Port</span><input max={65535} min={1} onChange={(event) => updateCredential("port", Number(event.target.value))} required type="number" value={credentials.port} /></label>
            <label><span>User</span><input autoComplete="username" onChange={(event) => updateCredential("user", event.target.value)} required value={credentials.user} /></label>
            <label><span>Password</span><input autoComplete="current-password" onChange={(event) => updateCredential("password", event.target.value)} required type="password" value={credentials.password} /></label>
            <button className="secondary-button" disabled={connecting || queueActive} type="submit">{connecting ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}{databases.length ? "Reconnect" : "Connect server"}</button>
          </form>

          {databases.length ? (
            <>
              <div className="sql-dump-destination">
                <label><span>{desktop ? "Save folder" : "Cloud storage folder"}</span><input onChange={(event) => setDestination(event.target.value)} placeholder={desktop ? "Choose any local folder" : "manual or clients/june"} readOnly={desktop} value={destination} /></label>
                {desktop ? <button className="secondary-button" onClick={chooseDirectory} type="button"><FolderOpen size={17} />Choose folder</button> : <small>storage/cxsync/sql-dumps/{destination || "manual"}</small>}
              </div>

              <div className="sql-database-list-card">
                <div className="sql-dump-table-head">
                  <label className="sql-database-select-all"><input checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(databases.map((item) => item.name)))} type="checkbox" /><span>{selected.size ? `${selected.size} selected` : `${databases.length} user databases`}</span></label>
                  <div className="sql-database-list-actions">
                    <button className="secondary-button" disabled={connecting || queueActive} onClick={() => void connect()} type="button">{connecting ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}Refresh</button>
                    <button className="primary-button" disabled={!selected.size || !destination.trim() || starting || queueActive} onClick={() => void startQueue()} type="button">{starting || queueActive ? <LoaderCircle className="spin" size={17} /> : <DatabaseBackup size={17} />}Bulk dump in queue</button>
                  </div>
                </div>
                <div className="sql-database-list-head"><span /><span>Database</span><span>Tables</span><span>Estimated size</span><span /></div>
                {databases.map((database) => (
                  <div className="sql-database-list-row" key={database.name}>
                    <input checked={selected.has(database.name)} onChange={() => toggle(database.name)} type="checkbox" />
                    <button className="sql-database-name" onClick={() => void openDatabase(database)} type="button"><Database size={17} /><strong>{database.name}</strong></button>
                    <span>{database.tableCount}</span><span>{formatBytes(database.sizeBytes)}</span>
                    <button aria-label={`Open ${database.name}`} className="icon-button" onClick={() => void openDatabase(database)} type="button"><ChevronRight size={18} /></button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <DatabaseShow database={shownDatabase} loading={loadingDetails} onBackup={() => void startQueue([shownDatabase.name])} queueActive={Boolean(queueActive || starting)} tables={tables} totalSize={shownSize} />
      )}

      {queue ? <QueueProgress queue={queue} /> : null}
    </section>
  )
}

function DatabaseShow({ database, loading, onBackup, queueActive, tables, totalSize }: { database: SqlDumpDatabase; loading: boolean; onBackup(): void; queueActive: boolean; tables: SqlDumpTable[]; totalSize: number }) {
  return <div className="sql-database-show">
    <div className="overview-status-grid"><Summary label="Tables" value={String(database.tableCount)} /><Summary label="Estimated size" value={formatBytes(database.sizeBytes)} /><Summary label="Loaded tables" value={String(tables.length)} /></div>
    <div className="sql-dump-table-card">
      <div className="sql-dump-table-head"><span><Table2 size={17} />{tables.length} tables · {formatBytes(totalSize)}</span><button className="primary-button" disabled={loading || queueActive || !tables.length} onClick={onBackup} type="button"><DatabaseBackup size={17} />Dump this database</button></div>
      {loading ? <div className="empty-mini"><LoaderCircle className="spin" size={20} />Loading table details...</div> : <div className="sql-dump-table-list">{tables.map((table) => <div className="sql-dump-table-detail" key={table.name}><Table2 size={15} /><span><strong>{table.name}</strong><small>{table.rows.toLocaleString()} estimated rows · {formatBytes(table.sizeBytes)}</small></span></div>)}</div>}
    </div>
  </div>
}

function QueueProgress({ queue }: { queue: SqlDumpQueue }) {
  const done = queue.completedCount + queue.failedCount
  const percent = queue.totalCount ? Math.round((done / queue.totalCount) * 100) : 0
  return <div className={`sql-dump-progress sql-dump-progress--${queue.status === "completed" ? "completed" : queue.status === "completed-with-errors" ? "failed" : "running"}`}>
    <div className="sql-dump-progress-title">{queue.status === "completed" ? <CheckCircle2 size={25} /> : <LoaderCircle className="spin" size={25} />}<div><strong>{queue.status === "completed" ? "Bulk SQL dump completed" : queue.status === "completed-with-errors" ? "Bulk dump completed with errors" : "Bulk dump queue running"}</strong><small>{done}/{queue.totalCount} finished · serial execution</small></div><b>{percent}%</b></div>
    <div className="sql-dump-progress-track"><span style={{ width: `${percent}%` }} /></div>
    <div className="sql-dump-queue-list">{queue.items.map((item) => <div key={item.id}><span>{item.status === "completed" ? <CheckCircle2 size={16} /> : item.status === "running" ? <LoaderCircle className="spin" size={16} /> : <Database size={16} />}<strong>{item.database}</strong></span><span>{item.status}{item.status === "running" ? ` · ${item.progress}%` : ""}</span><small>{item.fileName || item.error || item.destination}</small></div>)}</div>
  </div>
}

function Summary({ label, value }: { label: string; value: string }) { return <article className="summary-item"><span><Database size={18} /></span><div><strong>{value}</strong><small>{label}</small></div></article> }
function jsonPost(body: unknown): RequestInit { return { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method: "POST" } }
async function cloudRequest<T>(path: string, init: RequestInit = {}): Promise<T> { const response = await fetch(`${cxSyncCloudBrowserUrl() || window.location.origin}${path}`, { ...init, credentials: "include", headers: { ...cxSyncCloudBrowserHeaders(), ...init.headers } }); const body = await response.json().catch(() => null) as (T & { error?: string }) | null; if (!response.ok || !body) throw new Error(body?.error || `CXSync Cloud returned HTTP ${response.status}.`); return body }
function formatBytes(value: number) { if (!value) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1); return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}` }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : "SQL dump request failed." }
