import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCw, KeyRound, ShieldCheck, AppWindow, History, Bell, Mail, FileText, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import type { AuthSession } from "src/features/auth/auth-client"
import { createServiceToken, listPlatformFoundation, processPlatformOutbox, upsertPlatformApp, upsertPlatformPolicy } from "./platform-foundation-client"

export function PlatformFoundationPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState("")
  const query = useQuery({ queryKey: ["platform-foundation"], queryFn: () => listPlatformFoundation(session) })
  const tokenMutation = useMutation({ mutationFn: () => createServiceToken(session, { name: `Billing Service ${Date.now()}`, service_code: "billing", scopes: ["tenant.read", "billing.sales.create"] }) })
  const appMutation = useMutation({ mutationFn: () => upsertPlatformApp(session, { code: "billing", name: "Billing", category: "business" }) })
  const policyMutation = useMutation({ mutationFn: () => upsertPlatformPolicy(session, { code: "billing.sales.create", name: "Create Billing Sales", description: "Allows billing sales creation through service contracts." }) })
  const outboxMutation = useMutation({ mutationFn: () => processPlatformOutbox(session) })

  const data = query.data
  const stats = useMemo(() => [
    { label: "Policies", value: data?.policies.length ?? 0, Icon: ShieldCheck },
    { label: "Apps", value: data?.apps.length ?? 0, Icon: AppWindow },
    { label: "Tokens", value: data?.tokens.length ?? 0, Icon: KeyRound },
    { label: "Audit", value: data?.auditEvents.length ?? 0, Icon: History },
    { label: "Notifications", value: data?.notifications.length ?? 0, Icon: Bell },
    { label: "Mail", value: data?.mailRequests.length ?? 0, Icon: Mail },
    { label: "Files", value: data?.files.length ?? 0, Icon: FileText },
  ], [data])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["platform-foundation"] })
  }

  async function createToken() {
    const result = await tokenMutation.mutateAsync()
    if (!result.ok || !result.serviceToken?.token) throw new Error(result.error ?? "Token create failed.")
    setToken(result.serviceToken.token)
    toast.success("Service token created")
    await refresh()
  }

  async function runSeed(action: "app" | "policy") {
    const result = action === "app" ? await appMutation.mutateAsync() : await policyMutation.mutateAsync()
    if (!result.ok) throw new Error(result.error ?? "Save failed.")
    toast.success(action === "app" ? "App registry saved" : "Policy saved")
    await refresh()
  }

  async function processQueue() {
    const result = await outboxMutation.mutateAsync()
    toast.success("Outbox processed", { description: `${result.processed} job(s) handled.` })
    await refresh()
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Foundation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shared contracts used by Billing, Ecommerce, CRM, Sites, and CXSync.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => void refresh()} disabled={query.isFetching}><RefreshCw className="size-4" />Refresh</Button>
          <Button type="button" className="h-9 rounded-md" onClick={() => void processQueue()} disabled={outboxMutation.isPending}><Play className="size-4" />Process</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {stats.map(({ label, value, Icon }) => (
          <Card key={label} className="rounded-md border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="size-4 text-muted-foreground" />
              <div><div className="text-lg font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-md border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Live preparation actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-md" onClick={() => void runSeed("policy")}>Seed Billing policy</Button>
            <Button type="button" variant="outline" className="h-8 rounded-md" onClick={() => void runSeed("app")}>Seed Billing app</Button>
            <Button type="button" className="h-8 rounded-md" onClick={() => void createToken()}>Create Billing token</Button>
          </div>
        </CardHeader>
        {token ? <CardContent><Input readOnly value={token} className="font-mono text-xs" /></CardContent> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <SimpleTable title="Policies" rows={(data?.policies ?? []).map((item) => [item.code, item.name])} />
        <SimpleTable title="App Registry" rows={(data?.apps ?? []).map((item) => [item.code, item.status])} />
        <SimpleTable title="Service Tokens" rows={(data?.tokens ?? []).map((item) => [item.service_code, item.status])} />
        <SimpleTable title="Audit Events" rows={(data?.auditEvents ?? []).map((item) => [item.event_type, item.target_type])} />
        <SimpleTable title="Notifications" rows={(data?.notifications ?? []).map((item) => [item.subject, item.status])} />
        <SimpleTable title="Mail Requests" rows={(data?.mailRequests ?? []).map((item) => [item.to_email, item.status])} />
        <SimpleTable title="Files" rows={(data?.files ?? []).map((item) => [item.file_name, item.status])} />
      </div>
    </div>
  )
}

function SimpleTable({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <Card className="rounded-md border-border/70 shadow-sm">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <tbody>
            {rows.slice(0, 8).map(([left, right]) => (
              <tr key={`${left}-${right}`} className="border-t"><td className="px-4 py-2 font-medium">{left}</td><td className="px-4 py-2 text-right text-muted-foreground">{right}</td></tr>
            ))}
            {rows.length === 0 ? <tr className="border-t"><td className="px-4 py-4 text-muted-foreground" colSpan={2}>No rows.</td></tr> : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
