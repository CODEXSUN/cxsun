import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CreditCard, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Checkbox } from "src/components/ui/checkbox"
import type { AuthSession } from "src/features/auth/auth-client"
import {
  confirmMyRazorpaySubscriptionPayment,
  createMyRazorpaySubscriptionOrder,
  getMySubscriptionCatalog,
  type SubscriptionApp,
  type SubscriptionPlan,
} from "./subscription-client"
import { openRazorpayCheckout } from "./razorpay-checkout"

export function MySubscriptionPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const catalogQuery = useQuery({
    queryKey: ["my-subscription-catalog", session.selectedTenant.slug],
    queryFn: () => getMySubscriptionCatalog(session),
  })
  const apps = catalogQuery.data?.apps ?? []
  const plans = catalogQuery.data?.plans ?? []
  const subscription = catalogQuery.data?.subscription ?? null
  const [selectedPlanUuid, setSelectedPlanUuid] = useState("")
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const selectedPlan = plans.find((plan) => plan.uuid === selectedPlanUuid) ?? null
  const amount = useMemo(() => selectedPlan ? selectedPlan.base_price_paise : totalForApps(apps, selectedApps), [apps, selectedApps, selectedPlan])

  useEffect(() => {
    if (!selectedPlanUuid && plans[0]) {
      setSelectedPlanUuid(plans[0].uuid)
    }
  }, [plans, selectedPlanUuid])

  useEffect(() => {
    if (selectedPlan) {
      setSelectedApps(selectedPlan.apps.map((app) => app.app_key))
    }
  }, [selectedPlan])

  const payMutation = useMutation({
    mutationFn: () => createMyRazorpaySubscriptionOrder(session, {
      plan_uuid: selectedPlanUuid || undefined,
      app_keys: selectedApps,
      amount_paise: amount,
    }),
    onSuccess: async (result) => {
      if (typeof result.order.id !== "string") {
        toast.success("Payment order created")
        return
      }

      await openRazorpayCheckout({
        amount,
        description: selectedPlan ? `${selectedPlan.name} subscription` : "Custom app subscription",
        key: result.key_id,
        name: "CXSun Subscription",
        orderId: result.order.id,
        onPaid: async (response) => {
          await confirmMyRazorpaySubscriptionPayment(session, response)
          toast.success("Subscription activated")
          await queryClient.invalidateQueries({ queryKey: ["my-subscription-catalog", session.selectedTenant.slug] })
          window.dispatchEvent(new CustomEvent("cxsun:tenant-apps-published", { detail: { tenantSlug: session.selectedTenant.slug } }))
        },
      })
    },
    onError: (error) => toast.error("Payment could not start", { description: message(error) }),
  })

  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a plan or build your workspace app set.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => void catalogQuery.refetch()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {subscription ? (
        <Card className="rounded-md border-border/70">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Current subscription</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{subscription.plan_name ?? "Custom app subscription"}</p>
              </div>
              <Badge>{subscription.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-sm font-semibold">{formatMoney(subscription.amount_paise)} / {subscription.billing_cycle}</div>
            <div className="flex flex-wrap gap-1">
              {subscription.apps.filter((app) => app.is_enabled).map((app) => <Badge key={app.app_key} variant="outline">{app.app_key}</Badge>)}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.uuid} active={selectedPlanUuid === plan.uuid} plan={plan} onSelect={() => setSelectedPlanUuid(plan.uuid)} />
            ))}
            <button
              className={`rounded-md border p-4 text-left shadow-sm transition ${selectedPlanUuid === "" ? "border-primary/60 bg-primary/5" : "border-border/70 bg-card hover:border-primary/40"}`}
              type="button"
              onClick={() => setSelectedPlanUuid("")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Custom Apps</h3>
                {selectedPlanUuid === "" ? <Check className="size-4 text-primary" /> : null}
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">Pick apps one by one and pay according to selected modules.</p>
              <div className="mt-3 font-semibold">{formatMoney(totalForApps(apps, selectedApps))}</div>
            </button>
          </div>

          <Card className="rounded-md border-border/70">
            <CardHeader>
              <CardTitle>Apps and features</CardTitle>
              <p className="text-sm text-muted-foreground">Plan apps are selected automatically; custom mode lets you toggle each app.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {apps.filter((app) => app.app_key !== "application").map((app) => {
                const checked = selectedApps.includes(app.app_key)
                const locked = Boolean(selectedPlan)
                return (
                  <label key={app.app_key} className="flex gap-3 rounded-md border border-border/70 bg-background p-3">
                    <Checkbox checked={checked} disabled={locked} onCheckedChange={(value) => setSelectedApps((current) => toggleValue(current, app.app_key, value === true))} />
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{app.name}</span>
                        <span className="text-xs text-muted-foreground">{formatMoney(app.base_price_paise)}</span>
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">{app.summary}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{app.feature_summary}</span>
                    </span>
                  </label>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <Card className="h-fit rounded-md border-border/70">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <p className="text-sm text-muted-foreground">Payment activates apps after Razorpay confirmation.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-semibold">{formatMoney(amount)}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Razorpay: {catalogQuery.data?.razorpay.configured ? "configured" : "missing credentials"}</div>
            </div>
            <Button disabled={payMutation.isPending || amount <= 0 || selectedApps.length === 0} type="button" onClick={() => payMutation.mutate()}>
              <CreditCard className="size-4" />
              Pay and Activate
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PlanCard({ active, onSelect, plan }: { active: boolean; onSelect(): void; plan: SubscriptionPlan }) {
  return (
    <button className={`rounded-md border p-4 text-left shadow-sm transition ${active ? "border-primary/60 bg-primary/5" : "border-border/70 bg-card hover:border-primary/40"}`} type="button" onClick={onSelect}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{plan.name}</h3>
        {active ? <Check className="size-4 text-primary" /> : null}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{plan.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{formatMoney(plan.base_price_paise)}</span>
        <span className="text-muted-foreground">/{plan.billing_cycle}</span>
        <span className="text-muted-foreground">{plan.apps.length} apps</span>
      </div>
    </button>
  )
}

function toggleValue(values: string[], value: string, checked: boolean) {
  return checked ? [...new Set([...values, value])] : values.filter((item) => item !== value)
}

function totalForApps(apps: SubscriptionApp[], appKeys: string[]) {
  return apps.filter((app) => appKeys.includes(app.app_key)).reduce((total, app) => total + app.base_price_paise, 0)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency", maximumFractionDigits: 0 }).format(value / 100)
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again."
}
