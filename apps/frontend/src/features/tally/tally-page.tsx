import { useEffect, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Cable, DatabaseZap, RefreshCw, Save, Send, Settings2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table"
import { MasterListEmptyState, MasterListPageFrame } from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  createTallySyncJob,
  getTallyWorkspace,
  saveTallySettings,
  type TallySettings,
  type TallyWorkspace,
} from "./tally-client"

type TallyView = "desk" | "settings" | "jobs"

interface TallySettingsDraft {
  enabled: boolean
  tally_host: string
  tally_port: number
  company_name: string
  sync_sales: boolean
  sync_purchase: boolean
  sync_receipt: boolean
  sync_payment: boolean
  sync_inventory: boolean
  sync_contacts: boolean
  sync_direction: string
}

export function TallyPage({ session, view = "desk" }: { session: AuthSession; view?: TallyView }) {
  const query = useQuery({
    queryKey: ["tally-workspace", session.selectedTenant.slug],
    queryFn: () => getTallyWorkspace(session),
  })
  const workspace = query.data ?? null
  const [draft, setDraft] = useState<TallySettingsDraft>(() => draftFromSettings(null))

  useEffect(() => {
    if (workspace?.settings) {
      setDraft(draftFromSettings(workspace.settings))
    }
  }, [workspace?.settings])

  const saveMutation = useMutation({
    mutationFn: () => saveTallySettings(session, draft),
    onSuccess: async () => {
      toast.success("Tally settings saved")
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally settings not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })
  const syncMutation = useMutation({
    mutationFn: () => createTallySyncJob(session, { job_type: "manual-sync", direction: draft.sync_direction }),
    onSuccess: async () => {
      toast.success("Tally sync job queued")
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally sync not queued", {
        description: error instanceof Error ? error.message : "Please enable Tally and try again.",
      })
    },
  })
  const isWorking = query.isFetching || saveMutation.isPending || syncMutation.isPending
  const moduleCount = enabledModules(draft).length

  return (
    <MasterListPageFrame
      title={view === "settings" ? "Tally Settings" : view === "jobs" ? "Tally Sync Jobs" : "Tally Desk"}
      description="Connect this workspace to Tally, choose the records to sync, and queue integration jobs."
      technicalName={`page.tally.${view}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="rounded-md" variant="outline" type="button" disabled={isWorking} onClick={() => saveMutation.mutate()}>
            <Save className="size-4" />
            Save
          </Button>
          <Button className="rounded-md" type="button" disabled={isWorking || !draft.enabled} onClick={() => syncMutation.mutate()}>
            <Send className="size-4" />
            Queue Sync
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Cable} label="Connection" value={`${draft.tally_host || "localhost"}:${draft.tally_port || 9000}`} />
        <StatCard icon={DatabaseZap} label="Sync Modules" value={`${moduleCount} selected`} />
        <StatCard icon={Settings2} label="Status" value={draft.enabled ? "Enabled" : "Disabled"} />
      </div>

      {view !== "jobs" ? (
        <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Connection and sync scope</CardTitle>
            <p className="text-sm text-muted-foreground">
              Keep Tally open on the configured host and port before running an export/import job.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Enable Tally">
                <div className="flex h-8 items-center gap-3">
                  <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} />
                  <span className="text-sm text-muted-foreground">{draft.enabled ? "Ready for jobs" : "Jobs disabled"}</span>
                </div>
              </Field>
              <Field label="Tally Host">
                <Input value={draft.tally_host} onChange={(event) => setDraft((current) => ({ ...current, tally_host: event.target.value }))} placeholder="localhost" />
              </Field>
              <Field label="Tally Port">
                <Input type="number" min={1} value={draft.tally_port} onChange={(event) => setDraft((current) => ({ ...current, tally_port: Number(event.target.value) || 9000 }))} />
              </Field>
              <Field label="Tally Company Name">
                <Input value={draft.company_name} onChange={(event) => setDraft((current) => ({ ...current, company_name: event.target.value }))} placeholder="Optional exact Tally company" />
              </Field>
              <Field label="Direction">
                <Select value={draft.sync_direction} onValueChange={(sync_direction) => setDraft((current) => ({ ...current, sync_direction }))}>
                  <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="export">Export to Tally</SelectItem>
                    <SelectItem value="import">Import from Tally</SelectItem>
                    <SelectItem value="two-way">Two-way review</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {syncToggles.map((toggle) => (
                <label key={toggle.key} className="flex cursor-pointer items-center justify-between rounded-md border border-border/70 bg-background p-4">
                  <span>
                    <span className="block font-medium text-foreground">{toggle.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{toggle.description}</span>
                  </span>
                  <Switch
                    checked={Boolean(draft[toggle.key])}
                    onCheckedChange={(checked) => setDraft((current) => ({ ...current, [toggle.key]: checked }))}
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view !== "settings" ? <TallyJobs workspace={workspace} isLoading={query.isFetching} /> : null}
    </MasterListPageFrame>
  )
}

function TallyJobs({ isLoading, workspace }: { isLoading: boolean; workspace: TallyWorkspace | null }) {
  const jobs = workspace?.jobs ?? []
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>Recent sync jobs</CardTitle>
        <p className="text-sm text-muted-foreground">Queued jobs are stored first; the connector worker can process them next.</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.uuid}>
                <TableCell>
                  <div className="font-medium">{job.job_type}</div>
                  <div className="text-xs text-muted-foreground">{job.uuid}</div>
                </TableCell>
                <TableCell>{job.direction}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell>{job.requested_by}</TableCell>
                <TableCell>{job.success_count}/{job.total_records} done, {job.failed_count} failed</TableCell>
                <TableCell>{formatDate(job.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!jobs.length ? <MasterListEmptyState>{isLoading ? "Loading Tally jobs." : "No Tally sync jobs yet."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "failed" ? "destructive" : status === "completed" ? "default" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <span>
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="mt-1 block font-semibold text-foreground">{value}</span>
        </span>
      </CardContent>
    </Card>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function draftFromSettings(settings: TallySettings | null): TallySettingsDraft {
  return {
    enabled: Boolean(settings?.enabled),
    tally_host: settings?.tally_host ?? "localhost",
    tally_port: Number(settings?.tally_port ?? 9000),
    company_name: settings?.company_name ?? "",
    sync_sales: settings ? Boolean(settings.sync_sales) : true,
    sync_purchase: settings ? Boolean(settings.sync_purchase) : true,
    sync_receipt: settings ? Boolean(settings.sync_receipt) : true,
    sync_payment: settings ? Boolean(settings.sync_payment) : true,
    sync_inventory: settings ? Boolean(settings.sync_inventory) : false,
    sync_contacts: settings ? Boolean(settings.sync_contacts) : true,
    sync_direction: settings?.sync_direction ?? "export",
  }
}

function enabledModules(draft: TallySettingsDraft) {
  return syncToggles.filter((toggle) => draft[toggle.key])
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const syncToggles: Array<{ key: keyof Pick<TallySettingsDraft, "sync_sales" | "sync_purchase" | "sync_receipt" | "sync_payment" | "sync_inventory" | "sync_contacts">; label: string; description: string }> = [
  { key: "sync_sales", label: "Sales", description: "Sales invoices and voucher exports." },
  { key: "sync_purchase", label: "Purchase", description: "Purchase vouchers and supplier bills." },
  { key: "sync_receipt", label: "Receipts", description: "Customer receipt vouchers." },
  { key: "sync_payment", label: "Payments", description: "Supplier and expense payments." },
  { key: "sync_inventory", label: "Inventory", description: "Stock items and inventory movement." },
  { key: "sync_contacts", label: "Contacts", description: "Ledgers for customers and suppliers." },
]
