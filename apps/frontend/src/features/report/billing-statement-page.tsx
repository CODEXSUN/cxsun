"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Check, Printer } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "src/components/ui/button"
import { Card } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { getDefaultCompanyContext, listCompanies, type CompanyRecord } from "src/features/company/company-client"
import { listContacts, type ContactRecord } from "src/features/contact/contact-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { listPaymentEntries, type PaymentEntry } from "src/features/payment/payment-client"
import { listPurchaseEntries, type PurchaseEntry } from "src/features/purchase/purchase-client"
import { listReceiptEntries, type ReceiptEntry } from "src/features/receipt/receipt-client"
import { listSalesEntries, type SalesEntry } from "src/features/sales/sales-client"
import { defaultSoftwareSettingsState, type DutiesTaxSettings } from "src/features/settings/software-settings"
import { loadCompanySoftwareSettingsFromServer } from "src/features/settings/software-settings-service"

type StatementKind = "customer" | "supplier"

interface StatementFilters {
  fromDate: string
  partyKey: string
  toDate: string
}

interface StatementParty {
  addressLines: string[]
  gstin: string
  id: string | null
  key: string
  name: string
}

interface StatementMovement {
  credit: number
  date: string
  debit: number
  partyId: string | null
  partyName: string
  reference: string
  type: "Opening" | "Payment" | "Purchase" | "Receipt" | "Sales"
  voucherNo: string
}

interface StatementRow extends StatementMovement {
  age: number
  balance: number
}

interface GstFilters {
  fromDate: string
  monthId: string
  toDate: string
}

interface ReportMonthOption {
  fromDate: string
  label: string
  toDate: string
  value: string
}

interface GstRow {
  cgst: number
  date: string
  gst: number
  igst: number
  party: string
  sgst: number
  taxable: number
  total: number
  voucherNo: string
}

interface GstTotals {
  cgst: number
  gst: number
  igst: number
  sgst: number
  taxable: number
  total: number
}

export function CustomerStatementReportPage({ session }: { session: AuthSession }) {
  return <BillingStatementReportPage kind="customer" session={session} />
}

export function SupplierStatementReportPage({ session }: { session: AuthSession }) {
  return <BillingStatementReportPage kind="supplier" session={session} />
}

export function GstStatementReportPage({ session }: { session: AuthSession }) {
  const defaultMonth = useMemo(() => currentReportMonth(), [])
  const [filters, setFilters] = useState<GstFilters>(() => ({
    fromDate: defaultMonth.fromDate,
    monthId: defaultMonth.value,
    toDate: defaultMonth.toDate,
  }))
  const [monthOptions, setMonthOptions] = useState<readonly ReportMonthOption[]>([defaultMonth])
  const [dutiesTaxSettings, setDutiesTaxSettings] = useState<DutiesTaxSettings>(defaultSoftwareSettingsState.dutiesTaxSettings)

  const companiesQuery = useQuery({ queryKey: ["gst-report-companies", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const salesQuery = useQuery({ queryKey: ["gst-report-sales", session.selectedTenant.slug], queryFn: () => listSalesEntries(session) })
  const purchaseQuery = useQuery({ queryKey: ["gst-report-purchase", session.selectedTenant.slug], queryFn: () => listPurchaseEntries(session) })
  const monthsQuery = useQuery({ queryKey: ["gst-report-months", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "months") })
  const company = useMemo(() => pickCompany(companiesQuery.data ?? []), [companiesQuery.data])

  useEffect(() => {
    const options = toReportMonthOptions(monthsQuery.data ?? [])
    if (!options.length) return
    setMonthOptions(options)
    setFilters((current) => {
      if (current.monthId && options.some((option) => option.value === current.monthId)) return current
      const selected = options[0]
      return { ...current, fromDate: selected.fromDate, monthId: selected.value, toDate: selected.toDate }
    })
  }, [monthsQuery.data])

  useEffect(() => {
    if (!company) return
    const controller = new AbortController()
    void loadCompanySoftwareSettingsFromServer(session, company.id, { signal: controller.signal })
      .then((settings) => {
        if (!controller.signal.aborted) setDutiesTaxSettings(settings.dutiesTaxSettings)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [company, session])

  const salesRows = useMemo(() => buildGstRows(salesQuery.data ?? [], filters, "sales"), [filters, salesQuery.data])
  const purchaseRows = useMemo(() => buildGstRows(purchaseQuery.data ?? [], filters, "purchase"), [filters, purchaseQuery.data])
  const salesTotals = useMemo(() => gstRowTotals(salesRows), [salesRows])
  const purchaseTotals = useMemo(() => gstRowTotals(purchaseRows), [purchaseRows])
  const openingTotals = useMemo(
    () => buildOpeningGstTotals(salesQuery.data ?? [], purchaseQuery.data ?? [], filters, dutiesTaxSettings),
    [dutiesTaxSettings, filters, purchaseQuery.data, salesQuery.data],
  )
  const yearSalesTotals = useMemo(() => buildYearGstTotals(salesQuery.data ?? [], filters, "sales"), [filters, salesQuery.data])
  const yearPurchaseTotals = useMemo(() => buildYearGstTotals(purchaseQuery.data ?? [], filters, "purchase"), [filters, purchaseQuery.data])
  const balanceGst = openingTotals.gst + purchaseTotals.gst - salesTotals.gst

  return (
    <MasterListPageFrame
      action={<PrintButton />}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description="Review GST taxable value, tax amount, and total movement."
      technicalName="page.billing.report.gst-statement"
      title="GST Statement"
    >
      <GstReportPrintStyle />
      <GstReportFilters filters={filters} monthOptions={monthOptions} onChange={setFilters} />
      <GstReportPrintSheet company={company} title="GST Statement">
        <div className="grid gap-5">
          <GstReportCard>
            <div className="grid gap-4 xl:grid-cols-2">
              <GstSideTable rows={salesRows} title="Sales" />
              <GstSideTable rows={purchaseRows} title="Purchase" />
            </div>
          </GstReportCard>
          <GstReportCard>
            <GstSummaryCards
              balanceGst={balanceGst}
              openingTotals={openingTotals}
              purchaseTotals={purchaseTotals}
              salesTotals={salesTotals}
              yearPurchaseTotals={yearPurchaseTotals}
              yearSalesTotals={yearSalesTotals}
            />
          </GstReportCard>
        </div>
      </GstReportPrintSheet>
    </MasterListPageFrame>
  )
}

function BillingStatementReportPage({ kind, session }: { kind: StatementKind; session: AuthSession }) {
  const [filters, setFilters] = useState<StatementFilters>(() => ({
    fromDate: defaultFinancialYearStart(),
    partyKey: "",
    toDate: todayDate(),
  }))
  const title = kind === "customer" ? "Customer Statement" : "Supplier Statement"
  const partyLabel = kind === "customer" ? "Customer" : "Supplier"
  const description =
    kind === "customer"
      ? "Sales, receipts, and opening balance for sales customers only."
      : "Purchase, payments, and opening balance for purchase suppliers only."

  const companiesQuery = useQuery({ queryKey: ["statement-companies", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const defaultContextQuery = useQuery({ queryKey: ["statement-default-company-context", session.selectedTenant.slug], queryFn: () => getDefaultCompanyContext(session) })
  const contactsQuery = useQuery({ queryKey: ["statement-contacts", session.selectedTenant.slug], queryFn: () => listContacts(session) })
  const salesQuery = useQuery({ queryKey: ["statement-sales", session.selectedTenant.slug], queryFn: () => listSalesEntries(session) })
  const receiptsQuery = useQuery({ queryKey: ["statement-receipts", session.selectedTenant.slug], queryFn: () => listReceiptEntries(session) })
  const purchaseQuery = useQuery({ queryKey: ["statement-purchase", session.selectedTenant.slug], queryFn: () => listPurchaseEntries(session) })
  const paymentsQuery = useQuery({ queryKey: ["statement-payments", session.selectedTenant.slug], queryFn: () => listPaymentEntries(session) })

  const company = useMemo(() => pickCompany(companiesQuery.data ?? []), [companiesQuery.data])
  const parties = useMemo(
    () => (kind === "customer" ? salesParties(salesQuery.data ?? []) : supplierParties(purchaseQuery.data ?? [])),
    [kind, purchaseQuery.data, salesQuery.data],
  )
  const rows = useMemo(
    () =>
      kind === "customer"
        ? buildCustomerRows(salesQuery.data ?? [], receiptsQuery.data ?? [], contactsQuery.data ?? [], parties, filters)
        : buildSupplierRows(purchaseQuery.data ?? [], paymentsQuery.data ?? [], contactsQuery.data ?? [], parties, filters),
    [contactsQuery.data, filters, kind, parties, paymentsQuery.data, purchaseQuery.data, receiptsQuery.data, salesQuery.data],
  )
  const isLoading = companiesQuery.isLoading || contactsQuery.isLoading || salesQuery.isLoading || receiptsQuery.isLoading || purchaseQuery.isLoading || paymentsQuery.isLoading
  const selectedParty = parties.find((party) => party.key === filters.partyKey) ?? null
  const selectedContact = selectedParty ? findContactForParty(contactsQuery.data ?? [], selectedParty) : null

  useEffect(() => {
    const startDate = defaultContextQuery.data?.accountingYearStartDate?.slice(0, 10)
    if (!startDate) return
    setFilters((current) => {
      if (current.fromDate === startDate && current.toDate) return current
      return { ...current, fromDate: startDate, toDate: current.toDate || todayDate() }
    })
  }, [defaultContextQuery.data?.accountingYearStartDate])

  return (
    <MasterListPageFrame
      action={<PrintButton />}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description={description}
      technicalName={`page.billing.report.${kind}-statement`}
      title={title}
    >
      <StatementPrintStyle />
      <StatementFiltersCard
        filters={filters}
        isLoading={isLoading}
        partyLabel={partyLabel}
        partyOptions={parties}
        onChange={setFilters}
      />
      <StatementPrintSheet
        company={company}
        filters={filters}
        hasSelectedParty={Boolean(filters.partyKey)}
        partyLabel={partyLabel}
        selectedParty={selectedParty}
        selectedPartyAddressLines={selectedPartyAddressLines(selectedParty, selectedContact)}
      >
        <StatementTable hasSelectedParty={Boolean(filters.partyKey)} kind={kind} partyLabel={partyLabel} rows={rows} />
      </StatementPrintSheet>
    </MasterListPageFrame>
  )
}

function StatementFiltersCard({
  filters,
  isLoading,
  onChange,
  partyLabel,
  partyOptions,
}: {
  filters: StatementFilters
  isLoading: boolean
  onChange(nextFilters: StatementFilters): void
  partyLabel: string
  partyOptions: readonly StatementParty[]
}) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 p-3 shadow-sm print:hidden">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <PartyFilter
          label={partyLabel}
          options={partyOptions}
          value={filters.partyKey}
          onChange={(partyKey) => onChange({ ...filters, partyKey })}
        />
        <Input
          aria-label="From date"
          className="h-9 rounded-md bg-background"
          type="date"
          value={filters.fromDate}
          onChange={(event) => onChange({ ...filters, fromDate: event.target.value })}
        />
        <Input
          aria-label="To date"
          className="h-9 rounded-md bg-background"
          type="date"
          value={filters.toDate}
          onChange={(event) => onChange({ ...filters, toDate: event.target.value })}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {isLoading ? "Loading statement data..." : `${partyOptions.length} ${partyLabel.toLowerCase()}${partyOptions.length === 1 ? "" : "s"} from entries`}
      </div>
    </Card>
  )
}

function PartyFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange(value: string): void
  options: readonly StatementParty[]
  value: string
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find((option) => option.key === value)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = options.filter((option) => !normalizedQuery || option.name.toLowerCase().includes(normalizedQuery))

  useEffect(() => {
    setQuery(selected?.name ?? "")
  }, [selected?.name])

  return (
    <div className="relative z-10 focus-within:z-50">
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-label={label}
        className="h-9 rounded-md bg-background"
        placeholder={`Filter by ${label.toLowerCase()}`}
        role="combobox"
        value={query}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false)
            setQuery(selected?.name ?? "")
          }, 120)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          if (!event.target.value.trim()) onChange("")
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          {value ? (
            <button
              className="block w-full rounded-sm px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                setQuery("")
                onChange("")
                setIsOpen(false)
              }}
            >
              All {label.toLowerCase()}s
            </button>
          ) : null}
          {visibleOptions.map((option) => {
            const isSelected = option.key === value
            return (
              <button
                key={option.key}
                aria-selected={isSelected}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                role="option"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  setQuery(option.name)
                  onChange(option.key)
                  setIsOpen(false)
                }}
              >
                <span className="truncate">{option.name}</span>
                {isSelected ? <Check className="size-4 text-primary" strokeWidth={3} /> : <span className="size-4" />}
              </button>
            )
          })}
          {!visibleOptions.length ? <div className="px-3 py-2 text-sm text-muted-foreground">No {label.toLowerCase()} found</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function StatementPrintSheet({
  children,
  company,
  filters,
  hasSelectedParty,
  partyLabel,
  selectedParty,
  selectedPartyAddressLines,
}: {
  children: ReactNode
  company: CompanyRecord | null
  filters: StatementFilters
  hasSelectedParty: boolean
  partyLabel: string
  selectedParty: StatementParty | null
  selectedPartyAddressLines: readonly string[]
}) {
  return (
    <section className="statement-print-sheet rounded-md border border-border/70 bg-card p-4 shadow-sm print:fixed print:inset-0 print:z-[9999] print:m-0 print:block print:overflow-visible print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      <div className="print:mx-auto print:w-[198mm]">
        <StatementLetterhead company={company} />
        <div className="mb-0 rounded-md border border-border/70 text-sm print:rounded-none print:border-gray-400 print:text-[10px]">
          {hasSelectedParty ? (
            <div className="grid min-h-[24mm] grid-cols-1 leading-tight sm:grid-cols-2 print:grid-cols-2">
              <div className="min-w-0 px-3 py-3 text-left print:px-2 print:py-2">
                <div><span className="font-bold">M/s. {selectedParty?.name ?? partyLabel}</span></div>
                {selectedPartyAddressLines.map((line) => (
                  <div key={line} className="uppercase">
                    {line}
                  </div>
                ))}
                {selectedParty?.gstin ? <div>GSTIN/UIN&nbsp;&nbsp;: {selectedParty.gstin}</div> : null}
              </div>
              <div className="grid content-start gap-1 border-t border-border/70 px-3 py-3 text-left sm:border-l sm:border-t-0 print:border-l print:border-t-0 print:border-gray-400 print:px-2 print:py-2">
                <div className="font-semibold">Ledger Account</div>
                <div>
                  Statement Period From -{formatNumericDate(filters.fromDate)}
                  <span className="mx-1">To</span>
                  {formatNumericDate(filters.toDate)}
                </div>
              </div>
            </div>
          ) : (
            <div className="font-medium text-muted-foreground">Select a {partyLabel.toLowerCase()} to generate the statement.</div>
          )}
          {!hasSelectedParty ? <div className="text-xs font-medium text-amber-700 print:hidden">Select a {partyLabel.toLowerCase()} to generate the statement.</div> : null}
        </div>
        {children}
        <div className="hidden text-right text-[10px] leading-none print:fixed print:bottom-[7mm] print:right-[5mm] print:block">Page No :1</div>
      </div>
    </section>
  )
}

function StatementLetterhead({ company }: { company: CompanyRecord | null }) {
  const companyName = company?.legalName?.trim() || company?.name?.trim() || "Company"
  const address = companyAddress(company)
  const contact = [company?.primaryEmail ? `Email: ${company.primaryEmail}` : "", company?.primaryPhone ? `Phone: ${company.primaryPhone}` : ""].filter(Boolean).join("  ")

  return (
    <header className="hidden border border-border/70 text-center font-['Times_New_Roman'] print:block print:border-gray-400">
      <div className="grid min-h-[34mm] grid-cols-[32mm_1fr_32mm] items-center px-3 py-2 print:min-h-[30mm]">
        <div className="flex items-center justify-center">
          <img src="/logo.svg" alt={companyName} className="max-h-[24mm] max-w-[28mm] object-contain" />
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center space-y-1">
          <div className="max-w-full whitespace-nowrap text-[clamp(22px,3.5vw,30px)] font-bold leading-tight print:text-[22px]">{companyName}</div>
          <div className="max-w-[150mm] font-medium leading-[1.25] tracking-wide print:text-[10px]">
            {address ? <div>{address}</div> : null}
            {contact ? <div>{contact}</div> : null}
            {company?.gstinUin ? <div className="font-bold">GSTIN: {company.gstinUin}</div> : null}
          </div>
        </div>
        <div />
      </div>
    </header>
  )
}

function StatementTable({
  hasSelectedParty,
  kind,
  partyLabel,
  rows,
}: {
  hasSelectedParty: boolean
  kind: StatementKind
  partyLabel: string
  rows: readonly StatementRow[]
}) {
  const firstAmountHeader = kind === "supplier" ? "Purchase" : "Sales"
  const secondAmountHeader = kind === "supplier" ? "Payment" : "Receipt"
  const displayRows = hasSelectedParty ? rows : []

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:text-[10px]">
        <thead>
          <tr className="bg-muted/60 print:bg-white">
            {["Date", "Type", "Voucher", "Reference", firstAmountHeader, secondAmountHeader, "Balance", "Age"].map((header) => (
              <th key={header} className={statementCellClass(header, true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={`${row.type}-${row.voucherNo}-${row.date}-${index}`} className={row.type === "Opening" ? "bg-muted/20 font-semibold print:bg-white" : ""}>
              <td className={statementCellClass("Date")}>{row.type === "Opening" && !row.date ? "" : formatDate(row.date)}</td>
              <td className={statementCellClass("Type")}>{row.type}</td>
              <td className={statementCellClass("Voucher")}>{row.voucherNo}</td>
              <td className={statementCellClass("Reference")}>{row.reference}</td>
              <td className={statementCellClass(firstAmountHeader)}>{row.debit ? formatMoney(row.debit) : ""}</td>
              <td className={statementCellClass(secondAmountHeader)}>{row.credit ? formatMoney(row.credit) : ""}</td>
              <td className={statementCellClass("Balance")}>{formatMoney(row.balance)}</td>
              <td className={statementCellClass("Age")}>{row.type === "Opening" ? "" : row.age}</td>
            </tr>
          ))}
          {!displayRows.length ? (
            <tr>
              <td className="border border-border/70 px-3 py-8 text-center text-muted-foreground" colSpan={8}>
                {hasSelectedParty ? "No statement movement found." : `Select a ${partyLabel.toLowerCase()} to generate the statement.`}
              </td>
            </tr>
          ) : null}
          <tr className="bg-muted/30 font-bold print:bg-white">
            <td className={statementCellClass("Date")} colSpan={4}>
              TOTALS.
            </td>
            <td className={statementCellClass(firstAmountHeader)}>{formatMoney(sum(displayRows, "debit"))}</td>
            <td className={statementCellClass(secondAmountHeader)}>{formatMoney(sum(displayRows, "credit"))}</td>
            <td className={statementCellClass("Balance")}>{formatMoney(displayRows.at(-1)?.balance ?? 0)}</td>
            <td className={statementCellClass("Age")} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PrintButton() {
  return (
    <Button className="h-9 rounded-md print:hidden" type="button" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print
    </Button>
  )
}

function StatementPrintStyle() {
  return (
    <style>{`
      @page { size: A4 portrait; margin: 7mm 5mm; }
      @media print {
        body * { visibility: hidden; }
        .statement-print-sheet, .statement-print-sheet * { visibility: visible; }
      }
    `}</style>
  )
}

function GstReportPrintStyle() {
  return (
    <style>{`
      @page { size: A4 portrait; margin: 7mm 4mm 5mm; }
      @media print {
        body * { visibility: hidden; }
        .gst-report-print-sheet, .gst-report-print-sheet * { visibility: visible; }
      }
    `}</style>
  )
}

function GstReportFilters({
  filters,
  monthOptions,
  onChange,
}: {
  filters: GstFilters
  monthOptions: readonly ReportMonthOption[]
  onChange(value: GstFilters): void
}) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 p-3 shadow-sm print:hidden">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={filters.monthId}
          onChange={(event) => {
            const option = monthOptions.find((item) => item.value === event.target.value)
            onChange({
              ...filters,
              fromDate: option?.fromDate ?? filters.fromDate,
              monthId: event.target.value,
              toDate: option?.toDate ?? filters.toDate,
            })
          }}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Input
          aria-label="From date"
          className="h-9 rounded-md bg-background"
          type="date"
          value={filters.fromDate}
          onChange={(event) => onChange({ ...filters, fromDate: event.target.value, monthId: "" })}
        />
        <Input
          aria-label="To date"
          className="h-9 rounded-md bg-background"
          type="date"
          value={filters.toDate}
          onChange={(event) => onChange({ ...filters, monthId: "", toDate: event.target.value })}
        />
      </div>
    </Card>
  )
}

function GstReportPrintSheet({
  children,
  company,
  title,
}: {
  children: ReactNode
  company: CompanyRecord | null
  title: string
}) {
  return (
    <section className="gst-report-print-sheet rounded-md border border-border/70 bg-card p-4 shadow-sm print:fixed print:inset-0 print:z-[9999] print:mx-auto print:block print:min-h-0 print:w-full print:overflow-visible print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      <div className="hidden print:mx-auto print:block print:w-[198mm] print:max-w-none">
        <GstReportLetterhead company={company} title={title} />
        {children}
      </div>
      <div className="print:hidden">{children}</div>
    </section>
  )
}

function GstReportLetterhead({ company, title }: { company: CompanyRecord | null; title: string }) {
  const companyName = company?.legalName?.trim() || company?.name?.trim() || "Company"
  const addressLines = company ? companyAddressLines(company) : []
  const contactLine = company ? companyContactLine(company) : ""

  return (
    <header className="mb-3 border border-border/70 text-center font-[Verdana,Arial,sans-serif] text-[10px]">
      <div className="grid min-h-[25mm] grid-cols-[28mm_1fr_28mm] items-center border-b border-border/70 px-3 py-2">
        <div className="justify-self-start">
          <img src="/logo.svg" alt={companyName} className="max-h-[20mm] max-w-[24mm] object-contain" />
        </div>
        <div className="space-y-0.5">
          <div className="text-[18px] font-bold leading-tight">{companyName}</div>
          {addressLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
          {contactLine ? <div>{contactLine}</div> : null}
          {company?.gstinUin ? <div>GSTIN: {company.gstinUin}</div> : null}
        </div>
        <div />
      </div>
      <div className="py-1.5 text-[12px] font-bold uppercase">{title}</div>
    </header>
  )
}

function GstReportCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-md border border-border/70 bg-card p-3 shadow-sm print:border-0 print:bg-white print:p-0 print:shadow-none">
      {children}
    </section>
  )
}

function GstSideTable({ rows, title }: { rows: readonly GstRow[]; title: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70 print:overflow-visible">
      <div className="border-b border-border/70 bg-muted/45 px-3 py-2 text-sm font-semibold print:bg-white print:text-[10px]">
        {title}
      </div>
      <table className="w-full min-w-[620px] border-collapse text-sm print:min-w-0 print:text-[10px]">
        <thead>
          <tr>
            {["Date", "Voucher", "Party", "Taxable", "GST", "Total"].map((header) => (
              <th key={header} className="border border-border/70 px-3 py-2 text-left font-medium print:px-1.5 print:py-1">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.voucherNo}-${row.date}`}>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{formatDate(row.date)}</td>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{row.voucherNo}</td>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{row.party}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.taxable)}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.gst)}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.total)}</td>
            </tr>
          ))}
          <tr className="bg-muted/20 font-semibold print:bg-white">
            <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1" colSpan={3}>TOTALS.</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(gstSum(rows, "taxable"))}</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(gstSum(rows, "gst"))}</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(gstSum(rows, "total"))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function GstSummaryCards({
  balanceGst,
  openingTotals,
  purchaseTotals,
  salesTotals,
  yearPurchaseTotals,
  yearSalesTotals,
}: {
  balanceGst: number
  openingTotals: GstTotals
  purchaseTotals: GstTotals
  salesTotals: GstTotals
  yearPurchaseTotals: GstTotals
  yearSalesTotals: GstTotals
}) {
  const balanceTotals = {
    cgst: openingTotals.cgst + purchaseTotals.cgst - salesTotals.cgst,
    gst: balanceGst,
    igst: openingTotals.igst + purchaseTotals.igst - salesTotals.igst,
    sgst: openingTotals.sgst + purchaseTotals.sgst - salesTotals.sgst,
    taxable: openingTotals.taxable + purchaseTotals.taxable - salesTotals.taxable,
    total: openingTotals.total + purchaseTotals.total - salesTotals.total,
  }

  return (
    <div className="grid gap-3 text-sm print:text-[10px]">
      <GstSummarySection title="GST Balance">
        <GstMetricCard label="Opening GST" value={formatMoney(openingTotals.gst)} />
        <GstMetricCard label="Purchase GST" value={formatMoney(purchaseTotals.gst)} />
        <GstMetricCard label="Sales GST" value={formatMoney(salesTotals.gst)} />
        <GstMetricCard label="Balance" toneValue={balanceGst} value={formatSignedMoney(balanceGst)} strong />
      </GstSummarySection>
      <GstSummarySection title="Tax Split">
        <GstTaxSplitCard label="Opening" totals={openingTotals} />
        <GstTaxSplitCard label="Purchase" totals={purchaseTotals} />
        <GstTaxSplitCard label="Sales" totals={salesTotals} />
        <GstTaxSplitCard label="Balance" totals={balanceTotals} strong />
      </GstSummarySection>
      <GstSummarySection title="Period Comparison">
        <GstPeriodMiniCard title="This month" purchaseTotals={purchaseTotals} salesTotals={salesTotals} />
        <GstPeriodMiniCard title="This year" purchaseTotals={yearPurchaseTotals} salesTotals={yearSalesTotals} />
      </GstSummarySection>
    </div>
  )
}

function GstSummarySection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-border/70 bg-card p-3 shadow-sm print:bg-white print:p-2 print:shadow-none">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground print:mb-2 print:text-[9px]">
        {title}
      </div>
      <div className="grid overflow-hidden rounded-md border border-border divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

function GstMetricCard({ label, strong = false, toneValue, value }: { label: string; strong?: boolean; toneValue?: number; value: string }) {
  return (
    <div className="grid min-h-20 grid-rows-[auto_1fr] bg-card px-3 py-2 print:min-h-14 print:bg-white">
      <div className="text-xs font-medium text-muted-foreground print:text-[9px]">{label}</div>
      <div className={cn("self-end text-right text-base tabular-nums print:text-[10px]", strong ? "font-semibold" : "", toneClass(toneValue))}>
        {value}
      </div>
    </div>
  )
}

function GstTaxSplitCard({ label, strong = false, totals }: { label: string; strong?: boolean; totals: GstTotals }) {
  return (
    <div className={cn("grid bg-card print:bg-white", strong ? "font-semibold" : "")}>
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground print:px-2 print:py-1 print:text-[9px]">{label}</div>
      <div className="grid grid-cols-3 divide-x divide-border text-xs print:text-[9px]">
        <TaxSplitValue label="IGST" value={totals.igst} />
        <TaxSplitValue label="CGST" value={totals.cgst} />
        <TaxSplitValue label="SGST" value={totals.sgst} />
      </div>
    </div>
  )
}

function TaxSplitValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 px-3 py-2 print:px-2 print:py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right tabular-nums", toneClass(value))}>{formatMoney(value)}</span>
    </div>
  )
}

function GstPeriodMiniCard({ purchaseTotals, salesTotals, title }: { purchaseTotals: GstTotals; salesTotals: GstTotals; title: string }) {
  const differenceTotals = subtractGstTotals(salesTotals, purchaseTotals)
  return (
    <div className="bg-card print:bg-white xl:col-span-2">
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground print:px-2 print:py-1 print:text-[9px]">{title}</div>
      <div className="grid grid-cols-[6rem_repeat(3,minmax(0,1fr))] border-b border-border bg-muted/20 text-xs text-muted-foreground print:bg-white print:text-[9px]">
        <span />
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Taxable</span>
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Tax</span>
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Total</span>
      </div>
      <GstPeriodLine label="Sales" totals={salesTotals} />
      <GstPeriodLine label="Purchase" totals={purchaseTotals} />
      <GstPeriodLine label="Difference" totals={differenceTotals} strong />
    </div>
  )
}

function GstPeriodLine({ label, strong = false, totals }: { label: string; strong?: boolean; totals: GstTotals }) {
  return (
    <div className={cn("grid grid-cols-[6rem_repeat(3,minmax(0,1fr))] border-b border-border last:border-b-0", strong ? "bg-muted/15 font-semibold print:bg-white" : "")}>
      <span className="px-3 py-1.5 print:px-2 print:py-1">{label}</span>
      <span className={cn("border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1", toneClass(strong ? totals.taxable : undefined))}>{formatMoney(totals.taxable)}</span>
      <span className={cn("border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1", toneClass(strong ? totals.gst : undefined))}>{formatMoney(totals.gst)}</span>
      <span className={cn("border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1", toneClass(strong ? totals.total : undefined))}>{formatMoney(totals.total)}</span>
    </div>
  )
}

function buildCustomerRows(
  sales: readonly SalesEntry[],
  receipts: readonly ReceiptEntry[],
  contacts: readonly ContactRecord[],
  parties: readonly StatementParty[],
  filters: StatementFilters,
) {
  return buildRows(
    [
      ...sales.map((entry): StatementMovement => ({
        credit: 0,
        date: entry.invoice_date,
        debit: Number(entry.grand_total ?? 0),
        partyId: entry.customer_id,
        partyName: entry.customer_name,
        reference: entry.reference_no ?? "",
        type: "Sales",
        voucherNo: entry.invoice_no,
      })),
      ...receipts
        .filter((entry) => isAllowedParty(entry.party_id, entry.party_name, parties))
        .map((entry): StatementMovement => ({
          credit: Number(entry.net_amount ?? 0),
          date: entry.receipt_date,
          debit: 0,
          partyId: entry.party_id,
          partyName: entry.party_name,
          reference: entry.reference_no ?? "",
          type: "Receipt",
          voucherNo: entry.receipt_no,
        })),
    ],
    contacts,
    parties,
    filters,
  )
}

function buildSupplierRows(
  purchases: readonly PurchaseEntry[],
  payments: readonly PaymentEntry[],
  contacts: readonly ContactRecord[],
  parties: readonly StatementParty[],
  filters: StatementFilters,
) {
  return buildRows(
    [
      ...purchases.map((entry): StatementMovement => ({
        credit: 0,
        date: entry.supplier_bill_date || entry.entry_date,
        debit: Number(entry.grand_total ?? 0),
        partyId: entry.supplier_id,
        partyName: entry.supplier_name,
        reference: entry.reference_no ?? entry.supplier_bill_no ?? "",
        type: "Purchase",
        voucherNo: entry.supplier_bill_no || entry.entry_no,
      })),
      ...payments
        .filter((entry) => isAllowedParty(entry.party_id, entry.party_name, parties))
        .map((entry): StatementMovement => ({
          credit: Number(entry.net_amount ?? 0),
          date: entry.payment_date,
          debit: 0,
          partyId: entry.party_id,
          partyName: entry.party_name,
          reference: entry.reference_no ?? "",
          type: "Payment",
          voucherNo: entry.payment_no,
        })),
    ],
    contacts,
    parties,
    filters,
  )
}

function buildRows(
  movements: readonly StatementMovement[],
  contacts: readonly ContactRecord[],
  parties: readonly StatementParty[],
  filters: StatementFilters,
) {
  const filteredParties = filters.partyKey ? parties.filter((party) => party.key === filters.partyKey) : parties
  const partyLookup = new Map(parties.map((party) => [party.key, party]))
  const selectedMovements = movements.filter((row) => matchesParty(row, filters.partyKey, partyLookup))
  const priorMovements = selectedMovements.filter((row) => filters.fromDate && row.date.slice(0, 10) < filters.fromDate)
  const currentMovements = selectedMovements
    .filter((row) => inDateRange(row.date, filters.fromDate, filters.toDate))
    .sort((left, right) => left.date.localeCompare(right.date) || left.voucherNo.localeCompare(right.voucherNo))

  let opening = filteredParties.reduce((total, party) => total + contactOpeningBalance(contacts, party), 0)
  opening += priorMovements.reduce((total, row) => total + row.debit - row.credit, 0)
  let balance = opening
  const rows: StatementRow[] = []

  if (opening || filters.fromDate || filters.partyKey) {
    rows.push({
      age: 0,
      balance,
      credit: opening < 0 ? Math.abs(opening) : 0,
      date: filters.fromDate,
      debit: opening > 0 ? opening : 0,
      partyId: null,
      partyName: filters.partyKey ? filteredParties[0]?.name ?? "" : "Opening balance",
      reference: "Opening",
      type: "Opening",
      voucherNo: "",
    })
  }

  for (const row of currentMovements) {
    balance += row.debit - row.credit
    rows.push({ ...row, age: ageInDays(row.date), balance })
  }

  return rows
}

function salesParties(entries: readonly SalesEntry[]) {
  return uniqueParties(entries.map((entry) => ({ address: entry.billing_address, gstin: entry.customer_gstin, id: entry.customer_id, name: entry.customer_name })))
}

function supplierParties(entries: readonly PurchaseEntry[]) {
  return uniqueParties(entries.map((entry) => ({ address: entry.billing_address, gstin: entry.supplier_gstin, id: entry.supplier_id, name: entry.supplier_name })))
}

function uniqueParties(parties: readonly { address?: string | null; gstin?: string | null; id: string | null; name: string }[]) {
  const byKey = new Map<string, StatementParty>()
  for (const party of parties) {
    const name = party.name?.trim()
    if (!name) continue
    const key = partyKey(party.id, name)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { addressLines: splitAddressLines(party.address), gstin: party.gstin?.trim() ?? "", id: party.id, key, name })
    } else if ((!existing.addressLines.length && party.address) || (!existing.gstin && party.gstin)) {
      byKey.set(key, {
        ...existing,
        addressLines: existing.addressLines.length ? existing.addressLines : splitAddressLines(party.address),
        gstin: existing.gstin || party.gstin?.trim() || "",
      })
    }
  }
  return Array.from(byKey.values()).sort((left, right) => left.name.localeCompare(right.name))
}

function partyKey(id: string | null | undefined, name: string) {
  return id?.trim() || normalizePartyName(name)
}

function normalizePartyName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function matchesParty(row: StatementMovement, selectedKey: string, partyLookup: Map<string, StatementParty>) {
  const rowKey = partyKey(row.partyId, row.partyName)
  const rowName = normalizePartyName(row.partyName)
  const knownParty = partyLookup.get(rowKey) ?? Array.from(partyLookup.values()).find((party) => normalizePartyName(party.name) === rowName)
  if (!knownParty) return false
  return !selectedKey || knownParty.key === selectedKey || rowName === normalizePartyName(partyLookup.get(selectedKey)?.name ?? "")
}

function isAllowedParty(id: string | null | undefined, name: string, parties: readonly StatementParty[]) {
  const key = partyKey(id, name)
  const normalizedName = normalizePartyName(name)
  return parties.some((party) => party.key === key || normalizePartyName(party.name) === normalizedName)
}

function contactOpeningBalance(contacts: readonly ContactRecord[], party: StatementParty) {
  const contact = findContactForParty(contacts, party)
  if (!contact) return 0
  const balance = Number(contact.openingBalance ?? 0)
  return contact.balanceType?.toLowerCase() === "credit" ? -balance : balance
}

function selectedPartyAddressLines(party: StatementParty | null, contact: ContactRecord | null) {
  if (party?.addressLines.length) return party.addressLines
  if (!contact) return []
  const address = contact.addresses.find((item) => item.isDefault && item.isActive !== false) ?? contact.addresses.find((item) => item.isActive !== false) ?? contact.addresses[0]
  return [address?.addressLine1, address?.addressLine2].filter((line): line is string => Boolean(line?.trim()))
}

function findContactForParty(contacts: readonly ContactRecord[], party: StatementParty) {
  return contacts.find((item) => item.uuid === party.id || String(item.id) === party.id || normalizePartyName(item.name) === normalizePartyName(party.name)) ?? null
}

function pickCompany(companies: readonly CompanyRecord[]) {
  return companies.find((company) => company.isPrimary && company.isActive) ?? companies.find((company) => company.isActive) ?? companies[0] ?? null
}

function companyAddress(company: CompanyRecord | null) {
  if (!company) return ""
  const address = company.addresses.find((item) => item.isDefault && item.isActive) ?? company.addresses.find((item) => item.isActive) ?? company.addresses[0]
  return [address?.addressLine1, address?.addressLine2].filter(Boolean).join(", ")
}

function companyAddressLines(company: CompanyRecord) {
  const address = company.addresses.find((item) => item.isDefault && item.isActive) ?? company.addresses.find((item) => item.isActive) ?? company.addresses[0]
  return [address?.addressLine1, address?.addressLine2].map((line) => line?.trim() ?? "").filter(Boolean)
}

function companyContactLine(company: CompanyRecord) {
  const phone = company.primaryPhone?.trim() || company.phones.find((item) => item.isPrimary && item.isActive)?.phoneNumber?.trim() || company.phones.find((item) => item.isActive)?.phoneNumber?.trim() || ""
  const email = company.primaryEmail?.trim() || company.emails.find((item) => item.isActive)?.email?.trim() || ""
  return [phone ? `Mobile: ${phone}` : "", email ? `Email: ${email}` : ""].filter(Boolean).join(" | ")
}

function inDateRange(value: string, fromDate: string, toDate: string) {
  const date = value.slice(0, 10)
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
}

function statementCellClass(header: string, isHeader = false) {
  const isAmount = ["Age", "Balance", "Payment", "Purchase", "Receipt", "Sales"].includes(header)
  return cn("border border-border/70 px-3 py-2 print:px-1.5 print:py-1", isHeader ? "font-semibold" : "", isAmount ? "text-right tabular-nums" : "text-left")
}

function sum(rows: readonly StatementRow[], key: "credit" | "debit") {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
}

function formatDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

function formatNumericDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

function splitAddressLines(value?: string | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function ageInDays(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(Number(value ?? 0))
}

function buildGstRows(records: readonly (SalesEntry | PurchaseEntry)[], filters: GstFilters, kind: "purchase" | "sales") {
  return records
    .filter((record) => inDateRange(gstDocumentDate(record, kind), filters.fromDate, filters.toDate))
    .map((record): GstRow => {
      const totals = gstTotals(record)
      return {
        cgst: totals.cgst,
        date: gstDocumentDate(record, kind),
        gst: totals.gst,
        igst: totals.igst,
        party: kind === "sales" ? (record as SalesEntry).customer_name : (record as PurchaseEntry).supplier_name,
        sgst: totals.sgst,
        taxable: totals.taxable,
        total: totals.total,
        voucherNo: kind === "sales" ? (record as SalesEntry).invoice_no : ((record as PurchaseEntry).supplier_bill_no || (record as PurchaseEntry).entry_no),
      }
    })
    .sort((left, right) => left.date.localeCompare(right.date))
}

function gstTotals(record: SalesEntry | PurchaseEntry): GstTotals {
  const itemTotals = record.items.reduce(
    (total, item) => {
      const taxable = Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
      const gst = taxable * Number(item.tax_rate || 0) / 100
      return { gst: total.gst + gst, taxable: total.taxable + taxable }
    },
    { gst: 0, taxable: 0 },
  )
  const isIgst = record.place_of_supply === "igst"
  const igst = isIgst ? itemTotals.gst : 0
  const cgst = isIgst ? 0 : itemTotals.gst / 2
  const sgst = isIgst ? 0 : itemTotals.gst / 2
  return { cgst, gst: itemTotals.gst, igst, sgst, taxable: itemTotals.taxable, total: itemTotals.taxable + itemTotals.gst + Number(record.round_off ?? 0) }
}

function gstDocumentDate(record: SalesEntry | PurchaseEntry, kind: "purchase" | "sales") {
  return kind === "sales" ? (record as SalesEntry).invoice_date : ((record as PurchaseEntry).supplier_bill_date || (record as PurchaseEntry).entry_date)
}

function gstRowTotals(rows: readonly GstRow[]): GstTotals {
  return {
    cgst: gstSum(rows, "cgst"),
    gst: gstSum(rows, "gst"),
    igst: gstSum(rows, "igst"),
    sgst: gstSum(rows, "sgst"),
    taxable: gstSum(rows, "taxable"),
    total: gstSum(rows, "total"),
  }
}

function buildOpeningGstTotals(
  sales: readonly SalesEntry[],
  purchases: readonly PurchaseEntry[],
  filters: GstFilters,
  settings: DutiesTaxSettings,
) {
  const configuredOpening = openingGstTotalsFromSettings(settings)
  if (!filters.fromDate) return configuredOpening
  const asOnDate = settings.openingGstAsOnDate
  const afterAsOnDate = (date: string) => !asOnDate || date.slice(0, 10) > asOnDate
  const priorSalesTotals = aggregateGstRecords(sales.filter((record) => afterAsOnDate(record.invoice_date) && record.invoice_date.slice(0, 10) < filters.fromDate))
  const priorPurchaseTotals = aggregateGstRecords(purchases.filter((record) => afterAsOnDate(gstDocumentDate(record, "purchase")) && gstDocumentDate(record, "purchase").slice(0, 10) < filters.fromDate))
  return addGstTotals(configuredOpening, subtractGstTotals(priorPurchaseTotals, priorSalesTotals))
}

function buildYearGstTotals(records: readonly (SalesEntry | PurchaseEntry)[], filters: GstFilters, kind: "purchase" | "sales") {
  const year = (filters.fromDate || filters.toDate || todayDate()).slice(0, 4)
  return aggregateGstRecords(records.filter((record) => gstDocumentDate(record, kind).slice(0, 4) === year))
}

function aggregateGstRecords(records: readonly (SalesEntry | PurchaseEntry)[]) {
  return records.reduce((total, record) => addGstTotals(total, gstTotals(record)), emptyGstTotals())
}

function emptyGstTotals(): GstTotals {
  return { cgst: 0, gst: 0, igst: 0, sgst: 0, taxable: 0, total: 0 }
}

function openingGstTotalsFromSettings(settings: DutiesTaxSettings): GstTotals {
  const igst = Number(settings.openingGstIgst || 0)
  const cgst = Number(settings.openingGstCgst || 0)
  const sgst = Number(settings.openingGstSgst || 0)
  const gst = igst + cgst + sgst
  return { cgst, gst, igst, sgst, taxable: 0, total: gst }
}

function addGstTotals(left: GstTotals, right: GstTotals): GstTotals {
  return {
    cgst: left.cgst + right.cgst,
    gst: left.gst + right.gst,
    igst: left.igst + right.igst,
    sgst: left.sgst + right.sgst,
    taxable: left.taxable + right.taxable,
    total: left.total + right.total,
  }
}

function subtractGstTotals(left: GstTotals, right: GstTotals): GstTotals {
  return {
    cgst: left.cgst - right.cgst,
    gst: left.gst - right.gst,
    igst: left.igst - right.igst,
    sgst: left.sgst - right.sgst,
    taxable: left.taxable - right.taxable,
    total: left.total - right.total,
  }
}

function gstSum<T>(rows: readonly T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
}

function currentReportMonth() {
  const today = new Date()
  return reportMonthFor(today.getFullYear(), today.getMonth())
}

function reportMonthFor(year: number, monthIndex: number): ReportMonthOption {
  const month = String(monthIndex + 1).padStart(2, "0")
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    fromDate: `${year}-${month}-01`,
    label: monthLabel(year, monthIndex),
    toDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    value: `${year}-${month}`,
  }
}

function toReportMonthOptions(records: readonly MasterDataRecord[]) {
  const options = records
    .map((record) => {
      const fromDate = stringValue(record.startDate ?? record.start_date)
      const toDate = stringValue(record.endDate ?? record.end_date)
      if (!fromDate || !toDate) return null
      const date = new Date(`${fromDate.slice(0, 10)}T00:00:00`)
      return {
        fromDate: fromDate.slice(0, 10),
        label: stringValue(record.name) || monthLabel(date.getFullYear(), date.getMonth()),
        toDate: toDate.slice(0, 10),
        value: stringValue(record.code) || fromDate.slice(0, 7),
      }
    })
    .filter((option): option is ReportMonthOption => Boolean(option))

  return options.length ? options.sort((left, right) => left.fromDate.localeCompare(right.fromDate)) : Array.from({ length: 12 }, (_, index) => reportMonthFor(new Date().getFullYear(), index))
}

function monthLabel(year: number, monthIndex: number) {
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(year, monthIndex, 1))
  return `${monthName} -${year}`
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function formatSignedMoney(value: number) {
  if (value === 0) return formatMoney(0)
  return `${value > 0 ? "+" : "-"} ${formatMoney(Math.abs(value))}`
}

function toneClass(value: number | undefined) {
  if (value === undefined) return ""
  if (value < 0) return "text-red-600"
  if (value > 0) return "text-emerald-700"
  return "text-muted-foreground"
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function defaultFinancialYearStart() {
  const today = new Date()
  const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  return `${year}-04-01`
}
