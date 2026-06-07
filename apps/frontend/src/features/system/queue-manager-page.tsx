import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DatabaseBackup, ListRestart, PauseCircle, PlayCircle, RefreshCw, Server, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Checkbox } from "src/components/ui/checkbox"
import { NativeSelect } from "src/components/ui/native-select"
import { Spinner } from "src/components/ui/spinner"
import { Switch } from "src/components/ui/switch"
import type { AuthSession } from "src/features/auth/auth-client"
import {
  enqueueDatabaseBackup,
  getQueueOverview,
  listQueueJobs,
  queueJobAction,
  setQueueRuntimeMode,
  type QueueJob,
} from "./system-manager-client"

const statuses = ["all", "pending", "processing", "completed", "failed", "cancelled"]
const queueNames = ["all", "events", "mail", "reports", "database-backup", "system-update", "tenant-maintenance"]

export default function QueueManagerPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("all")
  const [queue, setQueue] = useState("all")
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([])
  const overviewQuery = useQuery({ queryKey: ["queue-overview"], queryFn: () => getQueueOverview(session) })
  const jobsQuery = useQuery({ queryKey: ["queue-jobs", status, queue], queryFn: () => listQueueJobs(session, status, queue) })
  const runtimeMutation = useMutation({
    mutationFn: (mode: "database" | "redis") => setQueueRuntimeMode(session, mode),
    onSuccess: async (runtime) => {
      toast.success(runtime.mode === "redis" ? "Redis queue enabled" : "In-code queue enabled", {
        description: runtime.mode === "redis"
          ? "Jobs will be sent to BullMQ when Redis is available."
          : "Jobs will run from the database using the local in-process worker.",
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["queue-jobs"] }),
      ])
    },
    onError: (error) => {
      toast.error("Queue runtime not changed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "retry" | "cancel" | "delete" }) => queueJobAction(session, id, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["queue-jobs"] }),
      ])
    },
  })
  const backupMutation = useMutation({
    mutationFn: () => enqueueDatabaseBackup(session),
    onSuccess: async () => {
      toast.success("Database backup queued", { description: "The database-backup lane will process it in the background." })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["queue-jobs"] }),
      ])
    },
  })
  const stats = useMemo(() => overviewQuery.data?.stats ?? [], [overviewQuery.data?.stats])
  const runtime = overviewQuery.data?.runtime
  const jobs = jobsQuery.data?.jobs ?? []
  const allSelected = jobs.length > 0 && jobs.every((job) => selectedJobIds.includes(job.id))
  const selectedCount = selectedJobIds.length
  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => queueJobAction(session, id, "delete")))
    },
    onSuccess: async () => {
      setSelectedJobIds([])
      toast.success("Selected queue jobs deleted")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["queue-jobs"] }),
      ])
    },
    onError: (error) => {
      toast.error("Bulk delete failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  useEffect(() => {
    const currentJobIds = new Set(jobs.map((job) => job.id))
    setSelectedJobIds((current) => current.filter((id) => currentJobIds.has(id)))
  }, [jobs])

  async function runAction(job: QueueJob, action: "retry" | "cancel" | "delete") {
    await actionMutation.mutateAsync({ id: job.id, action })
    setSelectedJobIds((current) => current.filter((id) => id !== job.id))
    toast.success(`Queue job ${action === "delete" ? "deleted" : action === "retry" ? "queued for retry" : "cancelled"}`, {
      description: `${job.type} #${job.id}`,
    })
  }

  function toggleSelected(jobId: number, checked: boolean | "indeterminate") {
    setSelectedJobIds((current) => (
      checked
        ? current.includes(jobId) ? current : [...current, jobId]
        : current.filter((id) => id !== jobId)
    ))
  }

  function toggleAll(checked: boolean | "indeterminate") {
    setSelectedJobIds(checked ? jobs.map((job) => job.id) : [])
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Queue Manager</h1>
          <p className="text-sm text-muted-foreground">Inspect platform jobs and recover failed or cancelled queue items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void backupMutation.mutateAsync()} disabled={backupMutation.isPending}>
            <DatabaseBackup className="size-4" />
            Backup now
          </Button>
          <Button type="button" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["queue-jobs"] })}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="rounded-md border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Server className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Queue runtime</h2>
                <Badge variant="outline">{runtime?.mode === "redis" ? "Redis / BullMQ" : "Database / in-code"}</Badge>
                {runtime?.worker?.started ? <Badge variant="secondary">worker running</Badge> : <Badge variant="destructive">worker stopped</Badge>}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Use Database / in-code for local development when Redis is not installed. Use Redis / BullMQ for production queue distribution.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Env default: {runtime?.configuredMode ?? "database"} | Redis: {runtime?.redisAvailable == null ? "not checked" : runtime.redisAvailable ? "available" : "unavailable"}
              </p>
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2">
            <span className="text-sm font-medium">Database</span>
            <Switch
              checked={runtime?.mode === "redis"}
              disabled={overviewQuery.isLoading || runtimeMutation.isPending}
              onCheckedChange={(checked) => runtimeMutation.mutate(checked ? "redis" : "database")}
            />
            <span className="text-sm font-medium">Redis</span>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statuses.slice(1).map((item) => {
          const count = stats.find((stat) => stat.status === item)?.count ?? 0
          return (
            <Card key={item} className="rounded-md">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{item}</p>
                <p className="mt-2 text-2xl font-semibold">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {overviewQuery.data?.bullmq?.length ? (
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>BullMQ lanes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {overviewQuery.data.bullmq.map((lane) => (
              <div key={lane.name} className="rounded-md border p-4">
                <p className="font-semibold">{lane.name}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {lane.counts
                    ? Object.entries(lane.counts).map(([key, value]) => (
                      <Badge key={key} variant="outline">{key}: {value}</Badge>
                    ))
                    : <Badge variant="destructive">unavailable</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-md">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Jobs</CardTitle>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0 || deleteSelectedMutation.isPending}
              onClick={() => void deleteSelectedMutation.mutateAsync(selectedJobIds)}
            >
              <Trash2 className="size-4" />
              Delete selected ({selectedCount})
            </Button>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <NativeSelect value={queue} onChange={(event) => setQueue(event.target.value)} className="h-9 w-full md:w-52">
              {queueNames.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </NativeSelect>
            <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full md:w-48">
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading queue jobs
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-center">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all queue jobs" />
                    </th>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Queue</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-center">Progress</th>
                    <th className="px-3 py-2 text-center">Attempts</th>
                    <th className="px-3 py-2 text-left">Run At</th>
                    <th className="px-3 py-2 text-left">Payload</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b align-middle">
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={selectedJobIds.includes(job.id)}
                          onCheckedChange={(checked) => toggleSelected(job.id, checked)}
                          aria-label={`Select queue job ${job.id}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono">{job.id}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{job.queue_name ?? "events"}</Badge></td>
                      <td className="px-3 py-2 font-medium">{job.type}</td>
                      <td className="px-3 py-2"><Badge variant={job.status === "failed" ? "destructive" : "outline"}>{job.status}</Badge></td>
                      <td className="px-3 py-2 text-center">{job.progress ?? 0}%</td>
                      <td className="px-3 py-2 text-center">{job.attempts}</td>
                      <td className="px-3 py-2">{formatDate(job.run_at)}</td>
                      <td className="max-w-[320px] truncate px-3 py-2 font-mono text-xs text-muted-foreground" title={job.error ?? JSON.stringify(job.result ?? job.payload)}>
                        {job.error ?? JSON.stringify(job.result ?? job.payload)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Retry" onClick={() => void runAction(job, "retry")}><PlayCircle className="size-4" /></Button>
                          <Button size="icon" variant="ghost" title="Cancel" onClick={() => void runAction(job, "cancel")}><PauseCircle className="size-4" /></Button>
                          <Button size="icon" variant="ghost" title="Delete" onClick={() => void runAction(job, "delete")}><Trash2 className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!jobsQuery.data?.jobs.length ? (
                <div className="grid min-h-32 place-items-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><ListRestart className="size-4" /> No queue jobs found</span>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
