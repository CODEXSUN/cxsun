import { useEffect, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Cable, CheckCircle2, CircleAlert, DatabaseZap, RefreshCw, Save, Send, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { MasterListEmptyState, MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table"
import { Textarea } from "src/components/ui/textarea"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  createFrappeSyncJob,
  getFrappeRecords,
  getFrappeWorkspace,
  postFrappeRecord,
  saveFrappeSettings,
  validateFrappeConnection,
  type FrappeConnectionValidation,
  type FrappeSettings,
  type FrappeWorkspace,
} from "./frappe-client"

type FrappeView = "handshake" | "desk" | "jobs"

interface FrappeDraft {
  base_url: string
  site_name: string
  api_key: string
  api_secret: string
  default_company: string
  default_warehouse: string
  timeout_seconds: number
  sync_contacts: boolean
  sync_products: boolean
  sync_sales: boolean
  sync_purchase: boolean
}

export function FrappePage({ session, view = "handshake" }: { session: AuthSession; view?: FrappeView }) {
  const query = useQuery({
    queryKey: ["frappe-workspace", session.selectedTenant.slug],
    queryFn: () => getFrappeWorkspace(session),
  })
  const workspace = query.data ?? null
  const settings = workspace?.settings ?? null
  const handshake = readHandshake(settings?.settings)
  const [draft, setDraft] = useState<FrappeDraft>(() => draftFromSettings(null))
  const [doctype, setDoctype] = useState("Item")
  const [fields, setFields] = useState('["name","modified"]')
  const [postJson, setPostJson] = useState('{\n  "item_code": "CX-SAMPLE",\n  "item_name": "CX Sample",\n  "item_group": "Products"\n}')
  const [resultJson, setResultJson] = useState("")

  useEffect(() => {
    if (settings) setDraft(draftFromSettings(settings))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => saveFrappeSettings(session, draft),
    onSuccess: async () => {
      toast.success("Frappe connection draft saved")
      await query.refetch()
    },
    onError: (error) => toast.error("Frappe draft not saved", { description: error instanceof Error ? error.message : "Please try again." }),
  })

  const validateMutation = useMutation({
    mutationFn: () => validateFrappeConnection(session, draft),
    onSuccess: async (result) => {
      toast[result.ok ? "success" : "error"](result.ok ? "Frappe handshake verified" : "Frappe handshake failed", {
        description: result.validation.detail,
      })
      await query.refetch()
    },
    onError: (error) => toast.error("Frappe handshake failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })

  const fetchMutation = useMutation({
    mutationFn: () => getFrappeRecords(session, { doctype, fields, limit: 20 }),
    onSuccess: async (result) => {
      setResultJson(JSON.stringify(result.data, null, 2))
      toast.success("Frappe records loaded")
      await query.refetch()
    },
    onError: (error) => toast.error("Frappe fetch failed", { description: error instanceof Error ? error.message : "Please verify the connection first." }),
  })

  const postMutation = useMutation({
    mutationFn: () => postFrappeRecord(session, { doctype, data: JSON.parse(postJson) as unknown }),
    onSuccess: async (result) => {
      setResultJson(JSON.stringify(result.data, null, 2))
      toast.success("Frappe record posted")
      await query.refetch()
    },
    onError: (error) => toast.error("Frappe post failed", { description: error instanceof Error ? error.message : "Check the JSON and Frappe permissions." }),
  })

  const jobMutation = useMutation({
    mutationFn: () => createFrappeSyncJob(session, {
      job_type: "single-operation",
      direction: "export",
      payload: { mode: "single-operation", doctype },
    }),
    onSuccess: async () => {
      toast.success("Frappe sync job queued")
      await query.refetch()
    },
    onError: (error) => toast.error("Frappe job not queued", { description: error instanceof Error ? error.message : "Please verify the handshake first." }),
  })

  const isWorking = query.isFetching || saveMutation.isPending || validateMutation.isPending || fetchMutation.isPending || postMutation.isPending || jobMutation.isPending
  const isHandshakeReady = Boolean(settings?.enabled) && Boolean(handshake?.ok)
  const canValidate = Boolean(draft.base_url.trim() && draft.api_key.trim() && draft.api_secret.trim()) && !isWorking

  return (
    <MasterListPageFrame
      title={pageTitle(view)}
      description={pageDescription(view)}
      technicalName={`page.frappe.${view}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          {view === "handshake" ? (
            <>
              <Button className="rounded-md" variant="outline" type="button" disabled={isWorking} onClick={() => saveMutation.mutate()}>
                <Save className="size-4" />
                Save Draft
              </Button>
              <Button className="rounded-md" type="button" disabled={!canValidate} onClick={() => validateMutation.mutate()}>
                <ShieldCheck className="size-4" />
                Validate Connection
              </Button>
            </>
          ) : null}
          {view === "desk" ? (
            <Button className="rounded-md" type="button" disabled={!isHandshakeReady || isWorking} onClick={() => jobMutation.mutate()}>
              <Send className="size-4" />
              Queue Job
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Cable} label="Endpoint" value={draft.base_url || "http://localhost:8000"} />
        <StatCard icon={DatabaseZap} label="Default Warehouse" value={draft.default_warehouse || "-"} />
        <StatCard icon={isHandshakeReady ? CheckCircle2 : CircleAlert} label="Handshake" value={isHandshakeReady ? "Verified" : "Pending"} />
      </div>

      {view === "handshake" ? <HandshakeView draft={draft} handshake={handshake} isWorking={isWorking} onChange={setDraft} /> : null}
      {view === "desk" ? (
        <DeskView
          doctype={doctype}
          fields={fields}
          isHandshakeReady={isHandshakeReady}
          isWorking={isWorking}
          postJson={postJson}
          resultJson={resultJson}
          onChangeDoctype={setDoctype}
          onChangeFields={setFields}
          onChangePostJson={setPostJson}
          onFetch={() => fetchMutation.mutate()}
          onPost={() => postMutation.mutate()}
        />
      ) : null}
      {view !== "handshake" ? <FrappeJobs workspace={workspace} isLoading={query.isFetching} /> : null}
    </MasterListPageFrame>
  )
}

function HandshakeView({
  draft,
  handshake,
  isWorking,
  onChange,
}: {
  draft: FrappeDraft
  handshake: FrappeConnectionValidation | null
  isWorking: boolean
  onChange(next: FrappeDraft | ((current: FrappeDraft) => FrappeDraft)): void
}) {
  const statusTone = handshake?.ok ? "border-emerald-200 bg-emerald-50/80 text-emerald-900" : handshake ? "border-amber-200 bg-amber-50/80 text-amber-900" : "border-border/70 bg-card/95 text-foreground"

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Frappe connection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Base URL">
            <Input value={draft.base_url} onChange={(event) => onChange((current) => ({ ...current, base_url: event.target.value }))} placeholder="http://localhost:8000" />
          </Field>
          <Field label="Site Name">
            <Input value={draft.site_name} onChange={(event) => onChange((current) => ({ ...current, site_name: event.target.value }))} placeholder="site1.local" />
          </Field>
          <Field label="API Token">
            <Input value={draft.api_key} onChange={(event) => onChange((current) => ({ ...current, api_key: event.target.value }))} />
          </Field>
          <Field label="API Secret">
            <Input type="password" value={draft.api_secret} onChange={(event) => onChange((current) => ({ ...current, api_secret: event.target.value }))} />
          </Field>
          <Field label="Default Company">
            <Input value={draft.default_company} onChange={(event) => onChange((current) => ({ ...current, default_company: event.target.value }))} />
          </Field>
          <Field label="Default Warehouse">
            <Input value={draft.default_warehouse} onChange={(event) => onChange((current) => ({ ...current, default_warehouse: event.target.value }))} />
          </Field>
          <Field label="Timeout Seconds">
            <Input type="number" min={1} max={120} value={draft.timeout_seconds} onChange={(event) => onChange((current) => ({ ...current, timeout_seconds: Number(event.target.value) || 30 }))} />
          </Field>
          <div className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-3">
            <Toggle label="Contacts" checked={draft.sync_contacts} onCheckedChange={(checked) => onChange((current) => ({ ...current, sync_contacts: checked }))} />
            <Toggle label="Products" checked={draft.sync_products} onCheckedChange={(checked) => onChange((current) => ({ ...current, sync_products: checked }))} />
            <Toggle label="Sales" checked={draft.sync_sales} onCheckedChange={(checked) => onChange((current) => ({ ...current, sync_sales: checked }))} />
            <Toggle label="Purchase" checked={draft.sync_purchase} onCheckedChange={(checked) => onChange((current) => ({ ...current, sync_purchase: checked }))} />
          </div>
        </CardContent>
      </Card>

      <Card className={cn("rounded-md shadow-sm", statusTone)}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Handshake result</CardTitle>
            <Badge variant={handshake?.ok ? "default" : handshake ? "secondary" : "outline"}>{handshake?.ok ? "Connected" : handshake ? "Needs attention" : "Not checked"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <StatusRow label="User" value={handshake?.authenticated_user || "-"} />
          <StatusRow label="HTTP" value={handshake?.http_status ? String(handshake.http_status) : "-"} />
          <StatusRow label="Latency" value={handshake?.latency_ms !== null && handshake?.latency_ms !== undefined ? `${handshake.latency_ms} ms` : "-"} />
          <StatusRow label="Checked" value={formatDate(handshake?.checked_at)} />
          <div className="rounded-md border border-current/10 bg-background/50 p-3 text-sm leading-6">{handshake?.detail || "Connection not checked."}</div>
          {isWorking ? <div className="text-xs font-medium">Working...</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function DeskView({
  doctype,
  fields,
  isHandshakeReady,
  isWorking,
  postJson,
  resultJson,
  onChangeDoctype,
  onChangeFields,
  onChangePostJson,
  onFetch,
  onPost,
}: {
  doctype: string
  fields: string
  isHandshakeReady: boolean
  isWorking: boolean
  postJson: string
  resultJson: string
  onChangeDoctype(value: string): void
  onChangeFields(value: string): void
  onChangePostJson(value: string): void
  onFetch(): void
  onPost(): void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>DocType workbench</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="DocType">
            <Input value={doctype} onChange={(event) => onChangeDoctype(event.target.value)} />
          </Field>
          <Field label="Fields">
            <Input value={fields} onChange={(event) => onChangeFields(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-md" type="button" disabled={!isHandshakeReady || isWorking} onClick={onFetch}>
              <DatabaseZap className="size-4" />
              Get Records
            </Button>
            <Button className="rounded-md" type="button" variant="outline" disabled={!isHandshakeReady || isWorking} onClick={onPost}>
              <Send className="size-4" />
              Post Record
            </Button>
          </div>
          <Field label="Post JSON">
            <Textarea className="min-h-56 font-mono text-xs" value={postJson} onChange={(event) => onChangePostJson(event.target.value)} />
          </Field>
        </CardContent>
      </Card>
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Response</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea className="min-h-[26rem] font-mono text-xs" readOnly value={resultJson || "No response yet."} />
        </CardContent>
      </Card>
    </div>
  )
}

function FrappeJobs({ workspace, isLoading }: { workspace: FrappeWorkspace | null; isLoading: boolean }) {
  const jobs = workspace?.jobs ?? []
  const links = workspace?.links ?? []

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader><CardTitle>Sync jobs</CardTitle></CardHeader>
        <CardContent>
          {jobs.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Status</TableHead><TableHead>Direction</TableHead><TableHead>Requested</TableHead></TableRow></TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.uuid}><TableCell className="font-medium">{job.job_type}</TableCell><TableCell>{job.status}</TableCell><TableCell>{job.direction}</TableCell><TableCell>{formatDate(job.created_at)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <MasterListEmptyState>{isLoading ? "Loading Frappe jobs." : "No sync jobs."}</MasterListEmptyState>}
        </CardContent>
      </Card>
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader><CardTitle>Record activity</CardTitle></CardHeader>
        <CardContent>
          {links.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>DocType</TableHead><TableHead>Status</TableHead><TableHead>Direction</TableHead><TableHead>Remote</TableHead></TableRow></TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.uuid}><TableCell className="font-medium">{link.doctype}</TableCell><TableCell>{link.status}</TableCell><TableCell>{link.direction}</TableCell><TableCell>{link.remote_name || link.record_label || "-"}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <MasterListEmptyState>{isLoading ? "Loading Frappe activity." : "No record activity."}</MasterListEmptyState>}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Cable; label: string; value: string }) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <div className="min-w-0"><div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div><div className="truncate text-sm font-semibold text-foreground">{value}</div></div>
      </CardContent>
    </Card>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>
}

function Toggle({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange(value: boolean): void }) {
  return <div className="flex items-center justify-between gap-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium">{value}</div></div>
}

function draftFromSettings(settings: FrappeSettings | null): FrappeDraft {
  return {
    base_url: settings?.base_url ?? "http://localhost:8000",
    site_name: settings?.site_name ?? "",
    api_key: settings?.api_key ?? "",
    api_secret: settings?.api_secret ?? "",
    default_company: settings?.default_company ?? "",
    default_warehouse: settings?.default_warehouse ?? "",
    timeout_seconds: Number(settings?.timeout_seconds ?? 30) || 30,
    sync_contacts: Boolean(settings?.sync_contacts ?? true),
    sync_products: Boolean(settings?.sync_products ?? true),
    sync_sales: Boolean(settings?.sync_sales ?? true),
    sync_purchase: Boolean(settings?.sync_purchase ?? true),
  }
}

function readHandshake(value?: string | null): FrappeConnectionValidation | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { handshake?: FrappeConnectionValidation }
    return parsed.handshake ?? null
  } catch {
    return null
  }
}

function pageTitle(view: FrappeView) {
  if (view === "desk") return "Frappe Desk"
  if (view === "jobs") return "Frappe Sync Jobs"
  return "Frappe Handshake"
}

function pageDescription(view: FrappeView) {
  if (view === "desk") return "Read and post Frappe DocType records through the verified tenant connection."
  if (view === "jobs") return "Review queued Frappe sync jobs and recent record activity."
  return "Save the tenant Frappe API token and verify the live connection."
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
