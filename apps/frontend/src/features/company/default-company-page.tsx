import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Building2, CalendarDays, Check, LayoutDashboard, Pencil, RefreshCw, Save, X, type LucideIcon } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { dashboardApps, isDashboardAppId } from "src/components/blocks/dashboard/dashboard-apps"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { cn } from "src/lib/utils"
import { getDefaultCompanyContext, listCompanies, updateDefaultCompanyContext, type CompanyRecord } from "./company-client"

interface LookupOption {
  id: string
  label: string
  meta?: string | null
}

export function DefaultCompanyPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [accountingYearId, setAccountingYearId] = useState("")
  const [landingApp, setLandingApp] = useState("")
  const contextQuery = useQuery({
    queryKey: ["default-company-context", session.selectedTenant.slug],
    queryFn: () => getDefaultCompanyContext(session),
  })
  const companiesQuery = useQuery({
    queryKey: ["companies", session.selectedTenant.slug, "default-lookup"],
    queryFn: () => listCompanies(session),
  })
  const yearsQuery = useQuery({
    queryKey: ["master-data-records", session.selectedTenant.slug, "accountingYear", "default-lookup"],
    queryFn: () => listMasterDataRecords(session, "accountingYear"),
  })
  const saveMutation = useMutation({
    mutationFn: () => updateDefaultCompanyContext(session, { companyId: Number(companyId), accountingYearId: Number(accountingYearId), landingApp }),
    onSuccess: async () => {
      toast.success("Default company updated")
      setIsEditing(false)
      await queryClient.invalidateQueries({ queryKey: ["default-company-context", session.selectedTenant.slug] })
    },
  })
  const context = contextQuery.data ?? null
  const companyOptions = useMemo(() => buildCompanyOptions(companiesQuery.data ?? []), [companiesQuery.data])
  const accountingYearOptions = useMemo(() => buildAccountingYearOptions(yearsQuery.data ?? []), [yearsQuery.data])
  const landingAppOptions = useMemo(() => buildLandingAppOptions(), [])
  const isLoading = contextQuery.isFetching || companiesQuery.isFetching || yearsQuery.isFetching
  const canSave = Boolean(companyId && accountingYearId && landingApp && !saveMutation.isPending)

  useEffect(() => {
    if (!context || isEditing) return
    setCompanyId(String(context.companyId))
    setAccountingYearId(String(context.accountingYearId))
    setLandingApp(normalizeLandingApp(context.landingApp))
  }, [context, isEditing])

  function beginEdit() {
    setCompanyId(context ? String(context.companyId) : "")
    setAccountingYearId(context ? String(context.accountingYearId) : "")
    setLandingApp(normalizeLandingApp(context?.landingApp))
    setIsEditing(true)
  }

  function cancelEdit() {
    setCompanyId(context ? String(context.companyId) : "")
    setAccountingYearId(context ? String(context.accountingYearId) : "")
    setLandingApp(normalizeLandingApp(context?.landingApp))
    setIsEditing(false)
  }

  async function refresh() {
    await Promise.all([
      contextQuery.refetch(),
      companiesQuery.refetch(),
      yearsQuery.refetch(),
    ])
  }

  return (
    <main className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-5 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Default Company</h1>
          <p className="mt-1 text-sm text-muted-foreground">Startup company and accounting year used across tenant workflows.</p>
        </div>
        <Button disabled={isLoading} onClick={() => void refresh()} type="button" variant="outline" className="h-9 rounded-md">
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <Card className="overflow-hidden rounded-md border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <CardTitle className="text-base">Startup Default</CardTitle>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button disabled={!canSave} onClick={() => void saveMutation.mutateAsync()} type="button" className="h-9 rounded-md">
                <Save className={cn("size-4", saveMutation.isPending && "animate-spin")} />
                Save
              </Button>
              <Button disabled={saveMutation.isPending} onClick={cancelEdit} type="button" variant="outline" className="h-9 rounded-md">
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button disabled={isLoading || !context} onClick={beginEdit} type="button" variant="outline" className="h-9 rounded-md">
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-0 p-0">
          {context ? (
            isEditing ? (
              <div className="grid gap-5 p-5 md:grid-cols-3">
                <DefaultLookupField icon={Building2} label="Company">
                  <NoCreateAutocomplete
                    disabled={companiesQuery.isFetching || saveMutation.isPending}
                    options={companyOptions}
                    placeholder="Search company"
                    value={companyId}
                    onChange={setCompanyId}
                  />
                </DefaultLookupField>
                <DefaultLookupField icon={CalendarDays} label="Accounting Year">
                  <NoCreateAutocomplete
                    disabled={yearsQuery.isFetching || saveMutation.isPending}
                    options={accountingYearOptions}
                    placeholder="Search accounting year"
                    value={accountingYearId}
                    onChange={setAccountingYearId}
                  />
                </DefaultLookupField>
                <DefaultLookupField icon={LayoutDashboard} label="Landing Desk">
                  <NoCreateAutocomplete
                    disabled={saveMutation.isPending}
                    options={landingAppOptions}
                    placeholder="Search landing app"
                    value={landingApp}
                    onChange={(value) => setLandingApp(normalizeLandingApp(value))}
                  />
                </DefaultLookupField>
              </div>
            ) : (
              <>
                <DefaultRow icon={Building2} label="Company" value={context.companyName} support={context.companyCode} />
                <DefaultRow icon={CalendarDays} label="Accounting Year" value={context.accountingYearName} support={formatPeriod(context.accountingYearStartDate, context.accountingYearEndDate)} />
                <DefaultRow icon={LayoutDashboard} label="Landing Desk" value={landingAppLabel(context.landingApp)} support="Opens first when the tenant dashboard loads" />
                <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Source</span>
                  <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">
                    default row
                  </Badge>
                </div>
              </>
            )
          ) : (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              No default company context is available for this tenant.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function DefaultLookupField({ children, icon: Icon, label }: { children: ReactNode; icon: LucideIcon; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {label}
      </Label>
      {children}
    </div>
  )
}

function DefaultRow({ icon: Icon, label, support, value }: { icon: LucideIcon; label: string; support?: string | null; value: string }) {
  return (
    <div className="grid gap-2 border-b border-border/70 px-5 py-4 last:border-b-0 md:grid-cols-[12rem_1fr] md:items-center">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
        {support ? <p className="mt-1 text-xs text-muted-foreground">{support}</p> : null}
      </div>
    </div>
  )
}

function NoCreateAutocomplete({ disabled = false, onChange, options, placeholder, value }: {
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

      const preferredHeight = 240
      const viewportPadding = 16
      const belowTop = rect.bottom + 8
      const belowSpace = window.innerHeight - belowTop - viewportPadding
      const aboveTop = Math.max(viewportPadding, rect.top - preferredHeight - 8)
      const top = belowSpace >= 96 ? belowTop : aboveTop
      const maxHeight = Math.min(preferredHeight, Math.max(96, window.innerHeight - top - viewportPadding))

      setListStyle({
        left: rect.left,
        maxHeight,
        top,
        width: rect.width,
      })
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
        className="h-11 w-full rounded-md"
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

function buildCompanyOptions(companies: CompanyRecord[]): LookupOption[] {
  return companies
    .filter((company) => company.isActive)
    .map((company) => ({
      id: String(company.id),
      label: company.name,
      meta: company.code,
    }))
    .sort((first, second) => first.label.localeCompare(second.label))
}

function buildAccountingYearOptions(years: MasterDataRecord[]): LookupOption[] {
  return years
    .filter((year) => year.is_active === true || year.is_active === 1)
    .map((year) => ({
      id: String(year.id),
      label: String(year.name ?? "-"),
      meta: `${formatPeriod(String(year.start_date ?? ""), String(year.end_date ?? "")) ?? ""}${year.is_current_year ? " · current" : ""}`,
    }))
    .sort((first, second) => first.label.localeCompare(second.label))
}

function buildLandingAppOptions(): LookupOption[] {
  return dashboardApps.map((app) => ({
    id: app.id,
    label: app.name,
    meta: app.description,
  }))
}

function normalizeLandingApp(value: unknown) {
  const text = String(value ?? "").trim()
  return isDashboardAppId(text) ? text : "application"
}

function landingAppLabel(value: unknown) {
  const appId = normalizeLandingApp(value)
  return dashboardApps.find((app) => app.id === appId)?.name ?? "Application"
}

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null
  return `${formatPlainDate(startDate)} to ${formatPlainDate(endDate)}`
}

function formatPlainDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date)
}
