import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Play, RefreshCw, RotateCcw, Server, Square } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { authHeaders, platformApiBaseUrl, type AuthSession } from "src/features/auth/auth-client"

type RuntimeApp = {
  id: string
  kind: "core"
  localUrl: string
  managed: boolean
  name: string
  port: number
  route: string
  running: boolean
  startable: boolean
  startedAt?: string
}

export function ProductAppDirectoryPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const runtimeQuery = useQuery({
    queryKey: ["app-runtime", "apps"],
    queryFn: () => listRuntimeApps(session),
    refetchInterval: 10000,
  })
  const startMutation = useMutation({
    mutationFn: (appId: string) => startRuntimeApp(session, appId),
    onError: (error) => toast.error(error instanceof Error ? error.message : "App start failed"),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ["app-runtime", "apps"] })
    },
  })
  const stopMutation = useMutation({
    mutationFn: (appId: string) => stopRuntimeApp(session, appId),
    onError: (error) => toast.error(error instanceof Error ? error.message : "App stop failed"),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ["app-runtime", "apps"] })
    },
  })
  const restartMutation = useMutation({
    mutationFn: (appId: string) => restartRuntimeApp(session, appId),
    onError: (error) => toast.error(error instanceof Error ? error.message : "App restart failed"),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ["app-runtime", "apps"] })
    },
  })
  const runtimeApps = runtimeQuery.data?.apps ?? []
  const isWorking = startMutation.isPending || stopMutation.isPending || restartMutation.isPending

  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runtime</h1>
          <p className="mt-1 text-sm text-muted-foreground">Backend and frontend status for the active billing app.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-md" disabled={runtimeQuery.isFetching} type="button" variant="outline" onClick={() => void runtimeQuery.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Badge className="rounded-md" variant="outline">{runtimeApps.filter((app) => app.running).length} running</Badge>
        </div>
      </div>

      <Card className="rounded-lg border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active services</CardTitle>
          <p className="text-sm text-muted-foreground">Only server and frontend are managed in this cleaned workspace.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1.3fr_0.5fr_0.7fr_1fr] gap-0 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground md:grid-cols-[1.5fr_0.5fr_0.7fr_1.2fr_1.1fr]">
              <span>App</span>
              <span>Port</span>
              <span>Status</span>
              <span className="hidden md:block">Route</span>
              <span className="text-right">Action</span>
            </div>
            {runtimeApps.map((app) => (
              <div className="grid grid-cols-[1.3fr_0.5fr_0.7fr_1fr] items-center gap-0 border-b px-3 py-2 text-sm last:border-b-0 md:grid-cols-[1.5fr_0.5fr_0.7fr_1.2fr_1.1fr]" key={app.id}>
                <div className="min-w-0">
                  <div className="font-medium">{app.name}</div>
                  <div className="text-xs capitalize text-muted-foreground">{app.kind}</div>
                </div>
                <span>{app.port}</span>
                <span><StatusBadge running={app.running} /></span>
                <span className="hidden truncate md:block">{app.route}</span>
                <div className="flex justify-end gap-2">
                  <Button asChild className="rounded-md" size="sm" variant="outline">
                    <a href={app.localUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open</a>
                  </Button>
                  {app.startable && !app.running ? (
                    <Button className="rounded-md" disabled={isWorking} size="sm" type="button" onClick={() => startMutation.mutate(app.id)}>
                      <Play className="size-4" />Start
                    </Button>
                  ) : null}
                  {app.startable && app.running ? (
                    <Button aria-label={`Restart ${app.name}`} className="size-8 rounded-md p-0" disabled={isWorking} size="icon" title="Restart app" type="button" variant="outline" onClick={() => restartMutation.mutate(app.id)}>
                      <RotateCcw className="size-4" />
                    </Button>
                  ) : null}
                  {app.startable && app.running && app.managed ? (
                    <Button className="rounded-md" disabled={isWorking} size="sm" type="button" variant="destructive" onClick={() => stopMutation.mutate(app.id)}>
                      <Square className="size-4" />Stop
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!runtimeApps.length ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Runtime status is unavailable. Refresh after the backend is running.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Info label="Backend" value="apps/server" />
        <Info label="Frontend" value="apps/frontend" />
        <Info label="Shared" value="packages/shared" />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><Server className="size-3.5" />{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  )
}

function StatusBadge({ running }: { running: boolean }) {
  return <Badge className="rounded-md" variant={running ? "default" : "outline"}>{running ? "Running" : "Stopped"}</Badge>
}

async function listRuntimeApps(session: AuthSession): Promise<{ apps: RuntimeApp[] }> {
  const response = await fetch(`${platformApiBaseUrl}/api/system/app-runtime/apps`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error("App runtime status failed")
  return response.json() as Promise<{ apps: RuntimeApp[] }>
}

async function startRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${platformApiBaseUrl}/api/system/app-runtime/start`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}

async function stopRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${platformApiBaseUrl}/api/system/app-runtime/stop`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}

async function restartRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${platformApiBaseUrl}/api/system/app-runtime/restart`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}
