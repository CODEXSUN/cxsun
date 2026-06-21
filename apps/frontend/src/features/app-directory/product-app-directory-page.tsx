import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink, Globe2, LayoutGrid, Play, RefreshCw, RotateCcw, Server, Square } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

type ProductApp = {
  capabilities: string[]
  description: string
  domains: string[]
  name: string
  port: number
  route: string
  slug: string
  status: "Scaffold" | "Active"
}

type RuntimeApp = {
  id: string
  kind: "core" | "product"
  localUrl: string
  managed: boolean
  name: string
  port: number
  route: string
  running: boolean
  startable: boolean
  startedAt?: string
}

const productApps: ProductApp[] = [
  { capabilities: ["Client filing workspace", "Service billing", "Document requests", "GST status tracking"], description: "Auditor office and client portal connected to billing, accounts, GST, documents, and communication.", domains: ["aaranassociates.com"], name: "Auditor Portal", port: 6030, route: "/app/auditor", slug: "auditor", status: "Scaffold" },
  { capabilities: ["Store catalog", "Orders", "Checkout handoff", "Invoice generation"], description: "Store owner workspace for Tirupur Direct, Horse Club, and future commerce brands.", domains: ["tirupurdirect.com", "horseclub.in"], name: "Ecommerce", port: 6031, route: "/app/ecommerce", slug: "ecommerce", status: "Scaffold" },
  { capabilities: ["Supplier directory", "Buyer RFQs", "Lead tracking", "Membership billing"], description: "B2B connection workspace for Tirupur Connect and future business networks.", domains: ["tirupurconnect.com"], name: "B2B Connect", port: 6032, route: "/app/b2b-connect", slug: "b2b-connect", status: "Scaffold" },
  { capabilities: ["Members", "Coaching batches", "Fee receipts", "Events"], description: "Sports club workspace for member operations, coaching, events, and fee collections.", domains: ["tenkasisports.com"], name: "Sports Club", port: 6033, route: "/app/sports", slug: "sports", status: "Scaffold" },
  { capabilities: ["Courses", "Batches", "Student fees", "Learning material"], description: "Learning platform for NEOT and future education clients.", domains: ["neot.in"], name: "Learning Platform", port: 6034, route: "/app/learning", slug: "learning", status: "Scaffold" },
  { capabilities: ["Donations", "Programs", "Volunteer records", "Public updates"], description: "Welfare organization workspace for donations, programs, accounting, and public communication.", domains: ["aaran.org"], name: "Welfare Organization", port: 6035, route: "/app/welfare", slug: "welfare", status: "Scaffold" },
  { capabilities: ["Leads", "Deals", "Activities", "Campaigns"], description: "Customer relationship workspace for sales activity and follow-up operations.", domains: ["crm.local"], name: "CRM", port: 6036, route: "/app/crm", slug: "crm", status: "Scaffold" },
  { capabilities: ["Public sites", "Pages", "Domains", "Lead forms"], description: "Site management workspace for client websites, pages, menus, forms, and publishing.", domains: ["sites.local"], name: "Sites", port: 6037, route: "/app/sites", slug: "sites", status: "Scaffold" },
  { capabilities: ["Posts", "Categories", "SEO", "Media"], description: "Content workspace for blogs, client brand articles, media, and SEO publishing.", domains: ["blog.local"], name: "Blog", port: 6038, route: "/app/blog", slug: "blog", status: "Scaffold" },
  { capabilities: ["Agent OS", "Approved tools", "Audit logs", "Typed actions"], description: "AI operating workspace for safe assistants, query tools, workflows, and audit activity.", domains: ["zetro.local"], name: "ZETRO", port: 6039, route: "/app/zetro", slug: "zetro", status: "Scaffold" },
  { capabilities: ["Test requests", "Certificates", "Service invoices", "Customer ledger"], description: "Textile lab workspace for sample testing, certificate delivery, and service billing.", domains: ["altexlabs.codexsun.com"], name: "Textile Lab", port: 6040, route: "/app/textile-lab", slug: "textile-lab", status: "Scaffold" },
  { capabilities: ["Production", "Job work", "Inventory consumption", "Reports"], description: "Garment manufacturing workspace for production tracking and billing/accounting handoff.", domains: ["garment.local"], name: "Garment Manufacturing", port: 6041, route: "/app/garment", slug: "garment", status: "Scaffold" },
  { capabilities: ["Quotation", "Projects", "Inventory issue", "Receipts"], description: "UPVC manufacturing workspace for projects, quotations, inventory, and collections.", domains: ["upvc.local"], name: "UPVC Manufacturing", port: 6042, route: "/app/upvc", slug: "upvc", status: "Scaffold" },
]

export function ProductAppDirectoryPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
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
  const fallbackRuntimeApps: RuntimeApp[] = productApps.map((app) => ({
    id: app.slug,
    kind: "product",
    localUrl: localAppUrl(app),
    managed: false,
    name: app.name,
    port: app.port,
    route: app.route,
    running: false,
    startable: true,
  }))
  const displayRuntimeApps = runtimeApps.length ? runtimeApps : fallbackRuntimeApps
  const selectedRuntimeApp = displayRuntimeApps.find((app) => app.id === selectedAppId) ?? null
  const selectedProductApp = selectedRuntimeApp ? productApps.find((app) => app.slug === selectedRuntimeApp.id) ?? null : null

  useEffect(() => {
    if (selectedAppId && displayRuntimeApps.length && !displayRuntimeApps.some((app) => app.id === selectedAppId)) {
      setSelectedAppId(null)
    }
  }, [displayRuntimeApps, selectedAppId])

  if (selectedRuntimeApp) {
    return (
      <AppRuntimeShowPage
        app={selectedRuntimeApp}
        isWorking={startMutation.isPending || stopMutation.isPending || restartMutation.isPending}
        product={selectedProductApp}
        onBack={() => setSelectedAppId(null)}
        onRestart={() => restartMutation.mutate(selectedRuntimeApp.id)}
        onStart={() => startMutation.mutate(selectedRuntimeApp.id)}
        onStop={() => stopMutation.mutate(selectedRuntimeApp.id)}
      />
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">Runtime control and product surfaces connected to the shared platform engines.</p>
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
          <CardTitle className="text-lg">Runtime apps</CardTitle>
          <p className="text-sm text-muted-foreground">Backend, main app, docs, and standalone product app ports.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_1fr] gap-0 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground md:grid-cols-[1.5fr_0.6fr_0.6fr_1.2fr_1.1fr]">
              <span>App</span>
              <span>Port</span>
              <span>Status</span>
              <span className="hidden md:block">Route</span>
              <span className="text-right">Action</span>
            </div>
            {displayRuntimeApps.map((app) => (
              <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_1fr] items-center gap-0 border-b px-3 py-2 text-sm last:border-b-0 md:grid-cols-[1.5fr_0.6fr_0.6fr_1.2fr_1.1fr]" key={app.id}>
                <div className="min-w-0">
                  <div className="font-medium">{app.name}</div>
                  <div className="text-xs capitalize text-muted-foreground">{app.kind}</div>
                </div>
                <span>{app.port}</span>
                <span><StatusBadge running={app.running} /></span>
                <span className="hidden truncate md:block">{app.route}</span>
                <div className="flex justify-end gap-2">
                  <Button className="rounded-md" size="sm" type="button" variant="outline" onClick={() => setSelectedAppId(app.id)}>View</Button>
                  <Button asChild className="rounded-md" size="sm" variant="outline">
                    <a href={app.localUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open</a>
                  </Button>
                  {app.startable && !app.running ? (
                    <Button className="rounded-md" disabled={startMutation.isPending} size="sm" type="button" onClick={() => startMutation.mutate(app.id)}>
                      <Play className="size-4" />Start
                    </Button>
                  ) : null}
                  {app.startable && app.running ? (
                    <Button aria-label={`Restart ${app.name}`} className="size-8 rounded-md p-0" disabled={restartMutation.isPending} size="icon" title="Restart app" type="button" variant="outline" onClick={() => restartMutation.mutate(app.id)}>
                      <RotateCcw className="size-4" />
                    </Button>
                  ) : null}
                  {app.startable && app.running && app.managed ? (
                    <Button className="rounded-md" disabled={stopMutation.isPending} size="sm" type="button" variant="destructive" onClick={() => stopMutation.mutate(app.id)}>
                      <Square className="size-4" />Stop
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Product previews are available on each app show page. Select View from the list to inspect the app card, route, port, and launch actions.
      </div>
    </div>
  )
}

function AppRuntimeShowPage({
  app,
  isWorking,
  onBack,
  onRestart,
  onStart,
  onStop,
  product,
}: {
  app: RuntimeApp
  isWorking: boolean
  onBack(): void
  onRestart(): void
  onStart(): void
  onStop(): void
  product: ProductApp | null
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button className="mb-3 rounded-md" type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{app.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Runtime app detail, preview, and super-admin controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-md" variant="outline">
            <a href={app.localUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open</a>
          </Button>
          {app.startable && !app.running ? <Button className="rounded-md" disabled={isWorking} type="button" onClick={onStart}><Play className="size-4" />Start</Button> : null}
          {app.startable && app.running ? <Button className="rounded-md" disabled={isWorking} type="button" variant="outline" onClick={onRestart}><RotateCcw className="size-4" />Restart</Button> : null}
          {app.startable && app.running && app.managed ? <Button className="rounded-md" disabled={isWorking} type="button" variant="destructive" onClick={onStop}><Square className="size-4" />Stop</Button> : null}
        </div>
      </div>

      <Card className="rounded-lg border-border/70">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Runtime detail</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{app.localUrl}</p>
            </div>
            <StatusBadge running={app.running} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Info label="Kind" value={app.kind} />
          <Info label="Port" value={String(app.port)} />
          <Info label="Route" value={app.route} />
          <Info label="Managed" value={app.managed ? "Yes" : "No"} />
        </CardContent>
      </Card>

      {product ? <ProductPreviewCard app={product} runtime={app} /> : (
        <Card className="rounded-lg border-border/70">
          <CardHeader><CardTitle className="text-lg">Core service</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">This is a core runtime service, so no product preview card is attached.</CardContent>
        </Card>
      )}
    </div>
  )
}

function ProductPreviewCard({ app, runtime }: { app: ProductApp; runtime?: RuntimeApp }) {
  return (
    <Card className="overflow-hidden rounded-lg border-border/70">
      <div className="border-b bg-muted/20 p-4">
        <PreviewMock app={app} />
      </div>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LayoutGrid className="size-5" />
            </span>
            <div>
              <CardTitle className="text-lg">{app.name}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{app.description}</p>
            </div>
          </div>
          <StatusBadge running={runtime?.running ?? false} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <Info label="Route" value={app.route} />
          <Info label="Port" value={String(app.port)} />
          <Info label="Primary domain" value={app.domains[0] ?? "-"} />
        </div>
        <div className="flex flex-wrap gap-2">
          {app.capabilities.map((capability) => <Badge className="rounded-md" key={capability} variant="secondary">{capability}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><a href={runtime?.localUrl ?? localAppUrl(app)} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open app</a></Button>
          {app.domains[0] ? <Button asChild variant="outline"><a href={`https://${app.domains[0]}`} rel="noreferrer" target="_blank"><Globe2 className="size-4" />Domain</a></Button> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function PreviewMock({ app }: { app: ProductApp }) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-xs font-semibold uppercase text-primary">{app.name}</span>
        <Badge className="rounded-md" variant="outline">{app.port}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {app.capabilities.slice(0, 3).map((item) => (
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5 text-xs" key={item}>
            <span>{item}</span>
            <span className="font-semibold text-primary">Ready</span>
          </div>
        ))}
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

function localAppUrl(app: ProductApp) {
  return `http://localhost:${app.port}${app.route}`
}

async function listRuntimeApps(session: AuthSession): Promise<{ apps: RuntimeApp[] }> {
  const response = await fetch(`${apiBaseUrl}/api/system/app-runtime/apps`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error("App runtime status failed")
  return response.json() as Promise<{ apps: RuntimeApp[] }>
}

async function startRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${apiBaseUrl}/api/system/app-runtime/start`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}

async function stopRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${apiBaseUrl}/api/system/app-runtime/stop`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}

async function restartRuntimeApp(session: AuthSession, appId: string): Promise<{ app: RuntimeApp; message: string }> {
  const response = await fetch(`${apiBaseUrl}/api/system/app-runtime/restart`, {
    body: JSON.stringify({ appId }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<{ app: RuntimeApp; message: string }>
}
