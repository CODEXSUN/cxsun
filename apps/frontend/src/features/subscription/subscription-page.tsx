import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CreditCard, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Checkbox } from "src/components/ui/checkbox"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { listTenants } from "src/features/tenant/infrastructure/tenant-api"
import type { TenantRecord } from "src/features/tenant/domain/tenant"
import {
  applyTenantSubscription,
  confirmRazorpaySubscriptionPayment,
  createRazorpaySubscriptionOrder,
  getSubscriptionCatalog,
  upsertSubscriptionPlan,
  type SubscriptionApp,
  type SubscriptionPlan,
  type TenantSubscription,
} from "./subscription-client"
import { openRazorpayCheckout } from "./razorpay-checkout"

interface PlanDraft {
  uuid?: string
  plan_key: string
  name: string
  summary: string
  billing_cycle: "monthly" | "yearly"
  base_price_rupees: string
  status: string
  app_prices: Record<string, string>
}

interface TenantSubscriptionDraft {
  plan_uuid: string
  app_keys: string[]
}

interface LookupOption {
  id: string
  label: string
  meta?: string
}

type SubscriptionPageMode = "list" | "show" | "upsert" | "plans"
type SubscriptionStatusFilter = "all" | "live" | "ended" | "none"

const subscriptionStatusFilters = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "ended", label: "Ended" },
  { id: "none", label: "No Subscription" },
] as const

export function SubscriptionPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const catalogQuery = useQuery({ queryKey: ["subscription-catalog"], queryFn: () => getSubscriptionCatalog(session) })
  const tenantsQuery = useQuery({ queryKey: ["tenants-for-subscriptions"], queryFn: () => listTenants(session) })
  const apps = catalogQuery.data?.apps ?? []
  const plans = catalogQuery.data?.plans ?? []
  const subscriptions = catalogQuery.data?.subscriptions ?? []
  const tenants = tenantsQuery.data ?? []
  const [tenantSearch, setTenantSearch] = useState("")
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const [pageMode, setPageMode] = useState<SubscriptionPageMode>("list")
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [tenantDraft, setTenantDraft] = useState<TenantSubscriptionDraft>(() => ({ plan_uuid: "", app_keys: [] }))
  const [planDraft, setPlanDraft] = useState<PlanDraft>(() => emptyPlanDraft())

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null
  const selectedSubscription = subscriptions.find((subscription) => subscription.tenant_id === selectedTenantId) ?? null
  const selectedPlan = plans.find((plan) => plan.uuid === tenantDraft.plan_uuid) ?? null
  const filteredTenants = useMemo(() => filterSubscriptionTenants({ search: tenantSearch, statusFilter, subscriptions, tenants }), [statusFilter, subscriptions, tenantSearch, tenants])
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / rowsPerPage))
  const pageTenants = filteredTenants.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const tenantAmount = selectedPlan ? selectedPlan.base_price_paise : totalForApps(apps, tenantDraft.app_keys)

  useEffect(() => {
    if (!selectedSubscription) {
      setTenantDraft({ plan_uuid: plans[0]?.uuid ?? "", app_keys: plans[0]?.apps.map((app) => app.app_key) ?? [] })
      return
    }

    setTenantDraft({
      plan_uuid: selectedSubscription.plan_uuid ?? "",
      app_keys: selectedSubscription.apps.filter((app) => app.is_enabled).map((app) => app.app_key),
    })
  }, [plans, selectedSubscription, selectedTenantId])

  useEffect(() => {
    if (selectedPlan) {
      setTenantDraft((current) => ({ ...current, app_keys: selectedPlan.apps.map((app) => app.app_key) }))
    }
  }, [selectedPlan])

  const savePlanMutation = useMutation({
    mutationFn: () => upsertSubscriptionPlan(session, {
      uuid: planDraft.uuid,
      plan_key: planDraft.plan_key,
      name: planDraft.name,
      summary: planDraft.summary,
      billing_cycle: planDraft.billing_cycle,
      base_price_paise: rupeesToPaise(planDraft.base_price_rupees),
      status: planDraft.status,
      plan_apps: Object.entries(planDraft.app_prices).map(([app_key, price]) => ({
        app_key,
        price_override_paise: price.trim() ? rupeesToPaise(price) : null,
      })),
    }),
    onSuccess: async () => {
      toast.success("Plan saved")
      setPlanDraft(emptyPlanDraft())
      await queryClient.invalidateQueries({ queryKey: ["subscription-catalog"] })
    },
    onError: (error) => toast.error("Plan not saved", { description: message(error) }),
  })

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedTenant) throw new Error("Select a tenant first.")
      return applyTenantSubscription(session, {
        tenant_id: selectedTenant.id,
        plan_uuid: tenantDraft.plan_uuid || undefined,
        app_keys: tenantDraft.app_keys,
        status: "active",
        billing_cycle: selectedPlan?.billing_cycle ?? "monthly",
      })
    },
    onSuccess: async () => {
      toast.success("Subscription updated", { description: "Tenant app access was published." })
      setPageMode("show")
      await queryClient.invalidateQueries({ queryKey: ["subscription-catalog"] })
      if (selectedTenant) notifyTenantAppsPublished(selectedTenant)
    },
    onError: (error) => toast.error("Subscription not updated", { description: message(error) }),
  })

  const orderMutation = useMutation({
    mutationFn: () => {
      if (!selectedTenant) throw new Error("Select a tenant first.")
      return createRazorpaySubscriptionOrder(session, {
        tenant_id: selectedTenant.id,
        subscription_uuid: selectedSubscription?.uuid,
        plan_uuid: tenantDraft.plan_uuid || undefined,
        app_keys: tenantDraft.app_keys,
        amount_paise: tenantAmount,
      })
    },
    onSuccess: async (result) => {
      const orderId = typeof result.order.id === "string" ? result.order.id : "created"
      toast.success("Razorpay order created", { description: orderId })
      if (typeof result.order.id === "string") {
        await openRazorpayCheckout({
          amount: tenantAmount,
          key: result.key_id,
          name: "CXSun Subscription",
          orderId: result.order.id,
          onPaid: async (response) => {
            await confirmRazorpaySubscriptionPayment(session, response)
            toast.success("Payment confirmed")
            setPageMode("show")
            await queryClient.invalidateQueries({ queryKey: ["subscription-catalog"] })
            if (selectedTenant) notifyTenantAppsPublished(selectedTenant)
          },
        })
      }
    },
    onError: (error) => toast.error("Razorpay order failed", { description: message(error) }),
  })

  if (pageMode === "plans") {
    return (
      <MasterListPageFrame
        title="Subscription Plans"
        description="Create and edit plans, connected apps, and app-level price overrides."
        technicalName="page.subscription.plans"
        action={
          <div className="flex items-center gap-2">
            <Button className="h-9 rounded-md" type="button" variant="outline" onClick={() => setPageMode("list")}>Back to list</Button>
            <Button className="h-9 rounded-md" type="button" variant="outline" onClick={() => setPlanDraft(emptyPlanDraft())}>
              <Plus className="size-4" />
              New plan
            </Button>
          </div>
        }
      >
        <PlanManager
          apps={apps}
          draft={planDraft}
          isSaving={savePlanMutation.isPending}
          plans={plans}
          onDraftChange={setPlanDraft}
          onSave={() => savePlanMutation.mutate()}
        />
      </MasterListPageFrame>
    )
  }

  if (selectedTenant && (pageMode === "show" || pageMode === "upsert")) {
    return (
      <MasterListPageFrame
        title={selectedTenant.name}
        description={pageMode === "upsert" ? "Update this tenant subscription and app access." : "Review tenant subscription, plan, status, and enabled apps."}
        technicalName={`page.subscription.${pageMode}`}
        action={
          <div className="flex items-center gap-2">
            <Button className="h-9 rounded-md" type="button" variant="outline" onClick={() => setPageMode("list")}>Back to list</Button>
            {pageMode === "show" ? (
              <Button className="h-9 rounded-md" type="button" onClick={() => setPageMode("upsert")}>
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        }
      >
        <TenantSubscriptionShow
          apps={apps}
          amount={tenantAmount}
          draft={tenantDraft}
          isCollecting={orderMutation.isPending}
          isSaving={applyMutation.isPending}
          mode={pageMode}
          plans={plans}
          selectedPlan={selectedPlan}
          subscription={selectedSubscription}
          tenant={selectedTenant}
          onCollect={() => orderMutation.mutate()}
          onDraftChange={setTenantDraft}
          onEdit={() => setPageMode("upsert")}
          onSave={() => applyMutation.mutate()}
          onCancel={() => setPageMode("show")}
        />
      </MasterListPageFrame>
    )
  }

  return (
    <MasterListPageFrame
      title="Subscriptions"
      description="Review every tenant subscription with plan details, subscription amount, end date, and live status."
      technicalName="page.subscription.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={catalogQuery.isFetching || tenantsQuery.isFetching} onClick={() => { void catalogQuery.refetch(); void tenantsQuery.refetch() }} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", (catalogQuery.isFetching || tenantsQuery.isFetching) && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setPageMode("plans")} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            Plans
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        filterOptions={subscriptionStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value as SubscriptionStatusFilter)
          setCurrentPage(1)
        }}
        onSearchValueChange={(value) => {
          setTenantSearch(value)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search tenant, slug, plan, subscription status, or amount"
        searchValue={tenantSearch}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader className="min-w-64">Tenant</ListHeader>
                <ListHeader>Plan Details</ListHeader>
                <ListHeader>Subscription Details</ListHeader>
                <ListHeader>End</ListHeader>
                <ListHeader>Live Status</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageTenants.map((tenant, index) => {
                const subscription = subscriptions.find((item) => item.tenant_id === tenant.id) ?? null
                return (
                  <tr key={tenant.id} className="border-b border-border/70">
                    <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    <td className="max-w-80 px-4 py-2">
                      <button
                        className="block max-w-full cursor-pointer truncate whitespace-nowrap font-medium hover:underline"
                        title={tenant.name}
                        type="button"
                        onClick={() => {
                          setSelectedTenantId(tenant.id)
                          setPageMode("show")
                        }}
                      >
                        {tenant.name}
                      </button>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{subscription?.plan_name ?? "No plan assigned"}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{subscription ? `${subscription.apps.filter((app) => app.is_enabled).length} apps · ${subscription.billing_cycle}` : "Open tenant to assign a plan"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{subscription ? formatMoney(subscription.amount_paise) : "-"}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{subscription?.uuid ?? "No subscription record"}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatSubscriptionEnd(subscription)}</td>
                    <td className="px-4 py-2">
                      <SubscriptionStatusBadge subscription={subscription} />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <MasterListRowActions
                        title={tenant.name}
                        deleteLabel="End subscription"
                        onEdit={() => {
                          setSelectedTenantId(tenant.id)
                          setPageMode("upsert")
                        }}
                        onView={() => {
                          setSelectedTenantId(tenant.id)
                          setPageMode("show")
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageTenants.length === 0 ? (
          <MasterListEmptyState>{catalogQuery.isFetching || tenantsQuery.isFetching ? "Loading subscriptions from database." : "No subscriptions found."}</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredTenants.length })}
        singularLabel="subscriptions"
        totalCount={filteredTenants.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function TenantSubscriptionShow({
  amount,
  apps,
  draft,
  isCollecting,
  isSaving,
  mode,
  onCancel,
  onCollect,
  onDraftChange,
  onEdit,
  onSave,
  plans,
  selectedPlan,
  subscription,
  tenant,
}: {
  amount: number
  apps: SubscriptionApp[]
  draft: TenantSubscriptionDraft
  isCollecting: boolean
  isSaving: boolean
  mode: "show" | "upsert"
  onCancel(): void
  onCollect(): void
  onDraftChange(value: TenantSubscriptionDraft): void
  onEdit(): void
  onSave(): void
  plans: SubscriptionPlan[]
  selectedPlan: SubscriptionPlan | null
  subscription: TenantSubscription | null
  tenant: TenantRecord
}) {
  const activeApps = mode === "upsert" ? draft.app_keys : subscription?.apps.filter((app) => app.is_enabled).map((app) => app.app_key) ?? []
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{tenant.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{tenant.slug} · code {tenant.code}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" type="button" onClick={mode === "upsert" ? onCancel : onEdit}>
              <Pencil className="size-4" />
              {mode === "upsert" ? "Cancel" : "Edit subscription"}
            </Button>
            <Button disabled={isCollecting || amount <= 0} type="button" onClick={onCollect}>
              <CreditCard className="size-4" />
              Collect
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Current plan" value={subscription?.plan_name ?? "Custom"} />
          <Metric label="Status" value={subscription?.status ?? "Not assigned"} />
          <Metric label="Amount" value={formatMoney(mode === "upsert" ? amount : subscription?.amount_paise ?? 0)} />
        </div>

        {mode === "upsert" ? (
          <div className="grid gap-4">
            <Field label="Plan">
              <LookupAutocomplete
                options={[{ id: "custom", label: "Custom apps", meta: "Choose apps manually" }, ...plans.map((plan) => ({ id: plan.uuid, label: plan.name, meta: `${formatMoney(plan.base_price_paise)} / ${plan.billing_cycle}` }))]}
                placeholder="Search plan"
                value={draft.plan_uuid || "custom"}
                onChange={(value) => onDraftChange({
                  ...draft,
                  plan_uuid: value === "custom" ? "" : value,
                  app_keys: value === "custom" ? draft.app_keys : plans.find((plan) => plan.uuid === value)?.apps.map((app) => app.app_key) ?? [],
                })}
              />
            </Field>
            <AppToggleGrid
              apps={apps}
              disabled={Boolean(selectedPlan)}
              selected={draft.app_keys}
              onToggle={(appKey, checked) => onDraftChange({ ...draft, app_keys: toggleValue(draft.app_keys, appKey, checked) })}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
              <div>
                <div className="text-sm font-semibold">{selectedPlan?.name ?? "Custom apps"}</div>
                <div className="text-xs text-muted-foreground">Amount {formatMoney(amount)}</div>
              </div>
              <Button disabled={isSaving || activeApps.length === 0} type="button" onClick={onSave}>
                <Save className="size-4" />
                Save subscription
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold">Enabled apps</h3>
            <div className="flex flex-wrap gap-2">
              {activeApps.length ? activeApps.map((appKey) => <Badge key={appKey} variant="outline">{appName(apps, appKey)}</Badge>) : <span className="text-sm text-muted-foreground">No apps enabled.</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlanManager({
  apps,
  draft,
  isSaving,
  onDraftChange,
  onSave,
  plans,
}: {
  apps: SubscriptionApp[]
  draft: PlanDraft
  isSaving: boolean
  onDraftChange(value: PlanDraft): void
  onSave(): void
  plans: SubscriptionPlan[]
}) {
  const selectedAppKeys = Object.keys(draft.app_prices)
  const appTotal = selectedAppKeys.reduce((total, appKey) => total + priceForPlanApp(apps, draft, appKey), 0)
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Plan upsert</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Edit plan details, connected apps, and optional app-level price overrides.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => onDraftChange(emptyPlanDraft())}>
            <Plus className="size-4" />
            New plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Plan key"><Input value={draft.plan_key} onChange={(event) => onDraftChange({ ...draft, plan_key: event.target.value })} /></Field>
          <Field label="Name"><Input value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></Field>
          <Field label="Cycle">
            <LookupAutocomplete
              options={[
                { id: "monthly", label: "Monthly", meta: "Bill every month" },
                { id: "yearly", label: "Yearly", meta: "Bill once per year" },
              ]}
              placeholder="Search cycle"
              value={draft.billing_cycle}
              onChange={(value) => onDraftChange({ ...draft, billing_cycle: value === "yearly" ? "yearly" : "monthly" })}
            />
          </Field>
          <Field label="Plan price"><Input inputMode="decimal" value={draft.base_price_rupees} onChange={(event) => onDraftChange({ ...draft, base_price_rupees: event.target.value })} /></Field>
        </div>
        <Field label="Summary"><Textarea value={draft.summary} onChange={(event) => onDraftChange({ ...draft, summary: event.target.value })} /></Field>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {apps.filter((app) => app.app_key !== "application").map((app) => {
            const checked = app.app_key in draft.app_prices
            return (
              <div key={app.app_key} className="rounded-md border border-border/70 bg-background p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox checked={checked} onCheckedChange={(value) => onDraftChange(togglePlanApp(draft, app, value === true))} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{app.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">{app.summary}</span>
                  </span>
                </label>
                {checked ? (
                  <Field label="App price in this plan">
                    <Input
                      inputMode="decimal"
                      placeholder={String(app.base_price_paise / 100)}
                      value={draft.app_prices[app.app_key] ?? ""}
                      onChange={(event) => onDraftChange({ ...draft, app_prices: { ...draft.app_prices, [app.app_key]: event.target.value } })}
                    />
                  </Field>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Connected app total: {formatMoney(appTotal)}</p>
          <Button disabled={isSaving || !draft.plan_key || !draft.name} type="button" onClick={onSave}>
            <Save className="size-4" />
            Save plan
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan) => (
            <button key={plan.uuid} className="rounded-md border border-border/70 bg-card p-4 text-left shadow-sm transition hover:border-primary/40" type="button" onClick={() => onDraftChange(planToDraft(plan))}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{plan.summary || "No summary"}</p>
                </div>
                <Badge variant={plan.status === "active" ? "default" : "secondary"}>{plan.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{formatMoney(plan.base_price_paise)}</span>
                <span className="text-muted-foreground">/{plan.billing_cycle}</span>
                <span className="text-muted-foreground">{plan.apps.length} apps</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AppToggleGrid({ apps, disabled = false, onToggle, selected }: { apps: SubscriptionApp[]; disabled?: boolean; onToggle(appKey: string, checked: boolean): void; selected: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {apps.filter((app) => app.app_key !== "application").map((app) => (
        <label key={app.app_key} className="flex gap-3 rounded-md border border-border/70 bg-background p-3">
          <Checkbox checked={selected.includes(app.app_key)} disabled={disabled} onCheckedChange={(value) => onToggle(app.app_key, value === true)} />
          <span>
            <span className="font-semibold">{app.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{formatMoney(app.base_price_paise)}</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">{app.feature_summary}</span>
          </span>
        </label>
      ))}
    </div>
  )
}

function LookupAutocomplete({
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean
  onChange(value: string): void
  options: LookupOption[]
  placeholder: string
  value: string
}) {
  const selectedOption = useMemo(() => options.find((option) => option.id === value) ?? null, [options, value])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(() => selectedOption?.label ?? "")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) => `${option.label} ${option.meta ?? ""}`.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  useEffect(() => {
    if (!isOpen) setQuery(selectedOption?.label ?? "")
  }, [isOpen, selectedOption])

  useEffect(() => {
    if (!isOpen) return
    const activeOption = listRef.current?.querySelector<HTMLElement>("[data-active='true']")
    activeOption?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function updateListPosition() {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return

      const preferredHeight = 260
      const viewportPadding = 16
      const belowTop = rect.bottom + 8
      const belowSpace = window.innerHeight - belowTop - viewportPadding
      const aboveTop = Math.max(viewportPadding, rect.top - preferredHeight - 8)
      const top = belowSpace >= 120 ? belowTop : aboveTop
      const maxHeight = Math.min(preferredHeight, Math.max(120, window.innerHeight - top - viewportPadding))

      setListStyle({ left: rect.left, maxHeight, top, width: rect.width })
    }

    updateListPosition()
    window.addEventListener("resize", updateListPosition)
    window.addEventListener("scroll", updateListPosition, true)
    return () => {
      window.removeEventListener("resize", updateListPosition)
      window.removeEventListener("scroll", updateListPosition, true)
    }
  }, [isOpen])

  function selectOption(option: LookupOption) {
    onChange(option.id)
    setQuery(option.label)
    setIsOpen(false)
  }

  function resetQuery() {
    setQuery(selectedOption?.label ?? "")
  }

  return (
    <div className="relative z-10 w-full focus-within:z-[90]">
      <Input
        ref={inputRef}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        className="h-10 w-full rounded-md"
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        value={query}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false)
            resetQuery()
          }, 120)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0)
            return
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0)
            return
          }
          if (event.key === "Enter") {
            event.preventDefault()
            const activeOption = filteredOptions[activeIndex]
            if (activeOption) selectOption(activeOption)
            return
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setIsOpen(false)
            resetQuery()
          }
        }}
      />
      {isOpen && listStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={listStyle}
          className="fixed z-[120] overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.length ? filteredOptions.map((option, index) => {
            const isSelected = option.id === value
            return (
              <button
                key={option.id}
                aria-selected={isSelected}
                data-active={activeIndex === index}
                role="option"
                type="button"
                className={activeIndex === index ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground" : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.meta ? <span className="block truncate text-xs text-muted-foreground">{option.meta}</span> : null}
                </span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          }) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching records.</div>
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-md border bg-muted/30 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>{children}</th>
}

function SubscriptionStatusBadge({ subscription }: { subscription: TenantSubscription | null }) {
  if (!subscription) return <Badge variant="secondary">Not assigned</Badge>
  const live = isSubscriptionLive(subscription)
  return <Badge variant={live ? "default" : "secondary"}>{live ? "Live" : "Ended"}</Badge>
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>
}

function emptyPlanDraft(): PlanDraft {
  return { plan_key: "", name: "", summary: "", billing_cycle: "monthly", base_price_rupees: "0", status: "active", app_prices: {} }
}

function planToDraft(plan: SubscriptionPlan): PlanDraft {
  return {
    uuid: plan.uuid,
    plan_key: plan.plan_key,
    name: plan.name,
    summary: plan.summary,
    billing_cycle: plan.billing_cycle,
    base_price_rupees: String(plan.base_price_paise / 100),
    status: plan.status,
    app_prices: Object.fromEntries(plan.apps.map((app) => [app.app_key, app.price_override_paise === null ? "" : String(app.price_override_paise / 100)])),
  }
}

function togglePlanApp(draft: PlanDraft, app: SubscriptionApp, checked: boolean): PlanDraft {
  const app_prices = { ...draft.app_prices }
  if (checked) app_prices[app.app_key] = app_prices[app.app_key] ?? ""
  else delete app_prices[app.app_key]
  return { ...draft, app_prices }
}

function priceForPlanApp(apps: SubscriptionApp[], draft: PlanDraft, appKey: string) {
  const override = draft.app_prices[appKey]
  if (override.trim()) return rupeesToPaise(override)
  return apps.find((app) => app.app_key === appKey)?.base_price_paise ?? 0
}

function filterSubscriptionTenants({
  search,
  statusFilter,
  subscriptions,
  tenants,
}: {
  search: string
  statusFilter: SubscriptionStatusFilter
  subscriptions: TenantSubscription[]
  tenants: TenantRecord[]
}) {
  const needle = search.trim().toLowerCase()
  return tenants.filter((tenant) => {
    const subscription = subscriptions.find((item) => item.tenant_id === tenant.id) ?? null
    if (statusFilter === "none" && subscription) return false
    if (statusFilter === "live" && !isSubscriptionLive(subscription)) return false
    if (statusFilter === "ended" && (!subscription || isSubscriptionLive(subscription))) return false
    if (!needle) return true

    return [
      tenant.name,
      tenant.slug,
      String(tenant.code),
      tenant.corporateId ?? "",
      subscription?.plan_name ?? "",
      subscription?.status ?? "",
      subscription ? formatMoney(subscription.amount_paise) : "",
    ].some((value) => value.toLowerCase().includes(needle))
  })
}

function notifyTenantAppsPublished(tenant: TenantRecord) {
  const detail = { at: Date.now(), tenantSlug: tenant.slug }
  window.localStorage.setItem("cxsun.tenant-apps-published", JSON.stringify(detail))
  window.dispatchEvent(new CustomEvent("cxsun:tenant-apps-published", { detail }))
}

function appName(apps: SubscriptionApp[], appKey: string) {
  return apps.find((app) => app.app_key === appKey)?.name ?? appKey
}

function toggleValue(values: string[], value: string, checked: boolean) {
  return checked ? [...new Set([...values, value])] : values.filter((item) => item !== value)
}

function totalForApps(apps: SubscriptionApp[], appKeys: string[]) {
  return apps.filter((app) => appKeys.includes(app.app_key)).reduce((total, app) => total + app.base_price_paise, 0)
}

function rupeesToPaise(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency", maximumFractionDigits: 0 }).format(value / 100)
}

function formatSubscriptionEnd(subscription: TenantSubscription | null) {
  if (!subscription) return "-"
  if (!subscription.current_period_end) return "No end date"
  const timestamp = Date.parse(subscription.current_period_end)
  if (!Number.isFinite(timestamp)) return subscription.current_period_end
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp))
}

function isSubscriptionLive(subscription: TenantSubscription | null) {
  if (!subscription) return false
  if (!["active", "trialing", "pending_payment", "past_due"].includes(subscription.status)) return false
  if (!subscription.current_period_end) return subscription.status !== "cancelled" && subscription.status !== "expired"
  const timestamp = Date.parse(subscription.current_period_end)
  return Number.isFinite(timestamp) ? timestamp >= Date.now() : true
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again."
}
