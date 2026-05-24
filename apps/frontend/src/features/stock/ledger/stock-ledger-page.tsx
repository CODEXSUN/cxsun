import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Barcode, Check, Printer, RefreshCw, Save, ScanLine, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AnimatedTabs, type AnimatedTab } from "src/components/ui/animated-tabs"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { MasterListPaginationCard, buildMasterListShowingLabel } from "src/components/blocks/lists/master-list"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { listPurchaseReceiptEntries } from "src/features/stock/inward/purchase-receipt/purchase-receipt-client"
import type { PurchaseReceiptEntry } from "src/features/stock/inward/purchase-receipt/purchase-receipt-client"
import {
  dropStockSerialization,
  generateStockSerialization,
  getPurchaseReceiptIntake,
  getStockLedgerSettings,
  listStockLiveBalances,
  postStockSerialization,
  upsertStockLedgerSettings,
  verifyStockSerialization,
  type StockSerialization,
  type StockSerializationItem,
  type StockLedgerReceiptIntakeItem,
  type StockSerializationMode,
} from "./stock-ledger-client"

export function StockLedgerPage({ session }: { session: AuthSession }) {
  const [activeStep, setActiveStep] = useState("intake")
  const [selectedReceiptUuid, setSelectedReceiptUuid] = useState("")
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState("1")
  const [mode, setMode] = useState<StockSerializationMode>("partial")
  const [modeOverride, setModeOverride] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [warehouseName, setWarehouseName] = useState("")
  const [batchNo, setBatchNo] = useState("")
  const [scanValue, setScanValue] = useState("")
  const [serialization, setSerialization] = useState<StockSerialization | null>(null)
  const [settingsDraft, setSettingsDraft] = useState({
    barcode_format: "{productCode}-{batchNo}-{serialNo}",
    batch_format: "{yy}{week}",
    serial_format: "{####}",
  })

  const receiptsQuery = useQuery({ queryKey: ["stock-ledger-purchase-receipts", session.selectedTenant.slug], queryFn: () => listPurchaseReceiptEntries(session) })
  const settingsQuery = useQuery({ queryKey: ["stock-ledger-settings", session.selectedTenant.slug], queryFn: () => getStockLedgerSettings(session) })
  const balancesQuery = useQuery({ queryKey: ["stock-ledger-balances", session.selectedTenant.slug], queryFn: () => listStockLiveBalances(session) })
  const intakeQuery = useQuery({
    enabled: Boolean(selectedReceiptUuid),
    queryKey: ["stock-ledger-intake", session.selectedTenant.slug, selectedReceiptUuid],
    queryFn: () => getPurchaseReceiptIntake(session, selectedReceiptUuid),
  })

  const selectedItem = useMemo(() => intakeQuery.data?.items.find((item) => item.id === selectedItemId) ?? null, [intakeQuery.data?.items, selectedItemId])
  const previousSerializations = useMemo(() => (intakeQuery.data?.serializations ?? []).filter((item) => item.purchase_receipt_item_id === selectedItemId), [intakeQuery.data?.serializations, selectedItemId])
  const settings = settingsQuery.data
  useEffect(() => {
    if (!settings) return
    setSettingsDraft({
      barcode_format: settings.barcode_format || "{productCode}-{batchNo}-{serialNo}",
      batch_format: settings.batch_format || "{yy}{week}",
      serial_format: normalizeSerialFormat(settings.serial_format || "{####}"),
    })
  }, [settings])

  const suggestedMode = useMemo<StockSerializationMode>(() => {
    const requestedQuantity = Number(quantity || 0)
    const pendingQuantity = Number(selectedItem?.pending_quantity || selectedItem?.quantity || 0)
    return pendingQuantity > 0 && requestedQuantity >= pendingQuantity ? "full" : "partial"
  }, [quantity, selectedItem?.pending_quantity, selectedItem?.quantity])
  const effectiveMode = modeOverride ? mode : suggestedMode

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedReceiptUuid || !selectedItem) throw new Error("Select a purchase receipt product first.")
      return generateStockSerialization(session, {
        batch_no: batchNo.trim() || null,
        mode: effectiveMode,
        purchase_receipt_item_id: selectedItem.id,
        purchase_receipt_uuid: selectedReceiptUuid,
        quantity: Number(quantity || 0),
        warehouse_id: warehouseId,
        warehouse_name: warehouseName.trim() || settings?.default_warehouse_name || null,
      })
    },
    onSuccess: (next) => {
      toast.success("Serials generated", { description: `${next.generated_quantity} barcode rows ready.` })
      setSerialization(next)
      setActiveStep("verify")
      void intakeQuery.refetch()
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (barcodes: string[]) => {
      if (!serialization) throw new Error("Generate serials first.")
      return verifyStockSerialization(session, serialization.uuid, barcodes)
    },
    onSuccess: (result) => {
      setSerialization(result.serialization ?? null)
      setScanValue("")
      if (result.unknown.length) toast.warning("Some scans were unknown", { description: result.unknown.join(", ") })
      else toast.success("Scan verified")
    },
  })

  const postMutation = useMutation({
    mutationFn: () => {
      if (!serialization) throw new Error("Generate and verify serials first.")
      return postStockSerialization(session, serialization.uuid)
    },
    onSuccess: (next) => {
      toast.success("Stock posted", { description: "Live stock has been updated." })
      setSerialization(next)
      setActiveStep("live")
      void balancesQuery.refetch()
      void intakeQuery.refetch()
    },
  })
  const dropMutation = useMutation({
    mutationFn: (serializationUuid: string) => dropStockSerialization(session, serializationUuid),
    onSuccess: () => {
      toast.success("Generated barcodes dropped")
      setSerialization(null)
      void intakeQuery.refetch()
    },
    onError: (error) => toast.error("Cannot drop barcodes", { description: error instanceof Error ? error.message : "Posted stock cannot be dropped or revised." }),
  })
  const settingsMutation = useMutation({
    mutationFn: () => upsertStockLedgerSettings(session, {
      ...settingsDraft,
      barcode_mode: settings?.barcode_mode ?? "readable",
      batch_enabled: Boolean(settings?.batch_enabled ?? true),
      company_id: settings?.company_id,
      default_warehouse_id: settings?.default_warehouse_id ?? null,
      default_warehouse_name: settings?.default_warehouse_name ?? null,
      serialization_enabled: Boolean(settings?.serialization_enabled ?? true),
    }),
    onSuccess: () => {
      toast.success("Stock settings saved")
      void settingsQuery.refetch()
    },
  })

  function scanCurrentValue() {
    const value = scanValue.trim()
    if (!value) return
    void verifyMutation.mutate([value])
  }

  const stepOrder = ["intake", "settings", "generate", "verify", "live"]
  function goNext() {
    const currentIndex = stepOrder.indexOf(activeStep)
    setActiveStep(stepOrder[Math.min(stepOrder.length - 1, currentIndex + 1)] ?? "intake")
  }
  function goBack() {
    const currentIndex = stepOrder.indexOf(activeStep)
    setActiveStep(stepOrder[Math.max(0, currentIndex - 1)] ?? "intake")
  }

  const tabs: AnimatedTab[] = [
    {
      value: "intake",
      label: "1. Intake",
      content: (
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="text-base">Purchase Receipt Intake</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <PurchaseReceiptAutocomplete
                label="Purchase receipt *"
                options={receiptsQuery.data ?? []}
                value={selectedReceiptUuid}
                onChange={(receipt) => {
                  setSelectedReceiptUuid(receipt?.uuid ?? "")
                  setSelectedItemId(null)
                  setSerialization(null)
                }}
              />
              <WarehouseAutocomplete session={session} value={warehouseId ?? settings?.default_warehouse_id ?? ""} onChange={(id, name) => { setWarehouseId(id); setWarehouseName(name) }} />
            </div>

            {intakeQuery.data ? (
              <div className="overflow-x-auto rounded-md border border-border/70">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <Header>Product</Header>
                      <Header>Unit</Header>
                      <Header className="text-right">Qty</Header>
                      <Header className="text-right">Generated</Header>
                      <Header className="text-right">Pending</Header>
                      <Header className="text-right">Action</Header>
                    </tr>
                  </thead>
                  <tbody>
                    {intakeQuery.data.items.map((item) => (
                      <tr key={item.id} className={cn("border-t border-border/60", selectedItemId === item.id && "bg-muted/35")}>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.unit ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{item.generated_quantity}</td>
                        <td className="px-3 py-2 text-right">{item.pending_quantity}</td>
                        <td className="px-3 py-2 text-right"><Button type="button" size="sm" variant={selectedItemId === item.id ? "default" : "outline"} className="rounded-md" onClick={() => { setSelectedItemId(item.id); setQuantity(String(Math.max(1, item.pending_quantity || item.quantity))); setModeOverride(false) }}>Select</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 p-6 text-sm text-muted-foreground">Select a purchase receipt to see product quantities.</div>
            )}

            <StepActions><Button disabled={!selectedItem} type="button" className="rounded-md" onClick={goNext}>Next</Button></StepActions>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "settings",
      label: "2. Settings",
      content: (
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="size-4" />Stock Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsFormatField
                helper="Use # inside braces for padded sequence digits."
                label="Serial format"
                value={settingsDraft.serial_format}
                onChange={(value) => setSettingsDraft((current) => ({ ...current, serial_format: normalizeSerialFormat(value) }))}
              />
              <SettingsFormatField
                helper="Use {yy} for two digit year and {week} for week number."
                label="Batch format"
                value={settingsDraft.batch_format}
                onChange={(value) => setSettingsDraft((current) => ({ ...current, batch_format: value }))}
              />
              <SettingsFormatField
                helper="Combine product, batch, and serial tokens for the printed barcode."
                label="Barcode format"
                value={settingsDraft.barcode_format}
                onChange={(value) => setSettingsDraft((current) => ({ ...current, barcode_format: value }))}
              />
            </div>
            <div className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-3 text-sm md:grid-cols-[1fr_1fr]">
              <div className="space-y-1 text-muted-foreground">
                <div><span className="font-medium text-foreground">Serial:</span> {"{####}"} gives 0001, 0002. Use {"{######}"} for six digits.</div>
                <div><span className="font-medium text-foreground">Batch:</span> {"{yy}{week}"} gives year + week, like {renderBatchPreview("{yy}{week}")}. Current week is {currentStockWeek()}.</div>
                <div><span className="font-medium text-foreground">Barcode:</span> supports {"{productCode}"}, {"{batchNo}"}, and {"{serialNo}"}.</div>
              </div>
              <div className="rounded-md bg-background p-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">Preview</div>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <div>Serial: {renderSerialPreview(settingsDraft.serial_format, 1)}</div>
                  <div>Batch: {renderBatchPreview(settingsDraft.batch_format)}</div>
                  <div>Barcode: {renderBarcodePreview(settingsDraft)}</div>
                </div>
              </div>
            </div>
            <StepActions>
              <Button type="button" variant="outline" className="rounded-md" onClick={goBack}>Back</Button>
              <Button disabled={settingsMutation.isPending} type="button" variant="outline" className="rounded-md" onClick={() => void settingsMutation.mutate()}><Save className={cn("size-4", settingsMutation.isPending && "animate-spin")} />Save settings</Button>
              <Button type="button" className="rounded-md" onClick={goNext}>Next</Button>
            </StepActions>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "generate",
      label: "3. Generate",
      content: (
        <div className="space-y-4">
          <Card className="rounded-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">Generate Serial and Batch</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border border-border/70 bg-muted/25 p-3 text-sm">
                <span className="font-medium">{selectedItem?.product_name ?? "No product selected"}</span>
                {selectedItem ? <span className="ml-2 text-muted-foreground">Pending {selectedItem.pending_quantity} of {selectedItem.quantity}</span> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <ModeLookup mode={effectiveMode} override={modeOverride} onChange={(nextMode) => { setMode(nextMode); setModeOverride(true) }} onAuto={() => setModeOverride(false)} />
                <Field label="Qty *" value={quantity} onChange={setQuantity} />
                <Field label="Batch no" value={batchNo} onChange={setBatchNo} />
                <div className="flex items-end">
                  <Button disabled={!selectedItem || generateMutation.isPending} type="button" className="h-11 w-full rounded-md" onClick={() => void generateMutation.mutate()}>
                    <Barcode className={cn("size-4", generateMutation.isPending && "animate-spin")} />Generate
                  </Button>
                </div>
              </div>
              <StepActions><Button type="button" variant="outline" className="rounded-md" onClick={goBack}>Back</Button><Button disabled={!serialization} type="button" className="rounded-md" onClick={goNext}>Next</Button></StepActions>
            </CardContent>
          </Card>
          <PreviousGeneratedCard
            isDropping={dropMutation.isPending}
            selectedItem={selectedItem}
            serializations={previousSerializations}
            onDrop={(item) => void dropMutation.mutate(item.uuid)}
          />
        </div>
      ),
    },
    {
      value: "verify",
      label: "4. Verify",
      content: serialization ? (
        <Card className="rounded-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span>{serialization.product_name} labels</span>
              <span className="text-sm font-normal text-muted-foreground">{serialization.verified_quantity}/{serialization.generated_quantity} verified</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input className="h-11 rounded-md" placeholder="Scan generated or physical barcode" value={scanValue} onChange={(event) => setScanValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scanCurrentValue() } }} />
              <Button disabled={verifyMutation.isPending} type="button" className="h-11 rounded-md" onClick={scanCurrentValue}><ScanLine className="size-4" />Verify scan</Button>
            </div>
            <SerialTable serialization={serialization} />
            <StepActions>
              <Button disabled={dropMutation.isPending || serialization.status === "posted"} type="button" variant="outline" className="rounded-md" onClick={() => void dropMutation.mutate(serialization.uuid)}>Drop before confirm</Button>
              <Button type="button" variant="outline" className="rounded-md" onClick={goBack}>Back</Button>
              <Button disabled={postMutation.isPending || serialization.verified_quantity <= 0} type="button" className="rounded-md" onClick={() => void postMutation.mutate()}>
                <Save className={cn("size-4", postMutation.isPending && "animate-spin")} />Confirm stock
              </Button>
              <Button disabled={serialization.verified_quantity <= 0} type="button" variant="outline" className="rounded-md" onClick={goNext}>Next</Button>
            </StepActions>
          </CardContent>
        </Card>
      ) : (
        previousSerializations.length ? (
          <PreviousGeneratedCard
            isDropping={dropMutation.isPending}
            selectedItem={selectedItem}
            serializations={previousSerializations}
            onDrop={(item) => void dropMutation.mutate(item.uuid)}
          />
        ) : <EmptyStep title="Generate serials first" body="Use the Generate tab before scanning or printing labels." />
      ),
    },
    {
      value: "live",
      label: "5. Live Stock",
      content: (
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="text-base">Live Stock</CardTitle></CardHeader>
          <CardContent className="space-y-4"><LiveStockTable balances={balancesQuery.data ?? []} /><StepActions><Button type="button" variant="outline" className="rounded-md" onClick={goBack}>Back</Button></StepActions></CardContent>
        </Card>
      ),
    },
  ]

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1500px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Stock Ledger</h1>
          <p className="text-sm text-muted-foreground">Generate, verify, and post purchase receipt stock labels.</p>
        </div>
        <Button type="button" variant="outline" className="rounded-md" onClick={() => { void receiptsQuery.refetch(); void balancesQuery.refetch(); void settingsQuery.refetch(); }}>
          <RefreshCw className="size-4" />Refresh
        </Button>
      </div>

      <AnimatedTabs
        className="[&>div:first-child]:rounded-md [&>div:first-child_button]:rounded-md"
        tabs={tabs}
        value={activeStep}
        onValueChange={setActiveStep}
      />
    </main>
  )
}

function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">{children}</div>
}

function EmptyStep({ body, title }: { body: string; title: string }) {
  return <div className="rounded-md border border-dashed border-border/70 p-6"><div className="font-medium">{title}</div><div className="mt-1 text-sm text-muted-foreground">{body}</div></div>
}

function ModeLookup({ mode, onAuto, onChange, override }: { mode: StockSerializationMode; onAuto(): void; onChange(mode: StockSerializationMode): void; override: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const options: Array<{ label: string; value: StockSerializationMode }> = [
    { label: "Auto", value: mode },
    { label: "Partial", value: "partial" },
    { label: "Full", value: "full" },
  ]
  const displayValue = override ? modeLabel(mode) : `Auto - ${modeLabel(mode)}`

  function selectOption(index: number) {
    const option = options[index]
    if (!option) return
    if (index === 0) onAuto()
    else onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label>Mode</Label>
      <Input
        readOnly
        aria-autocomplete="list"
        aria-expanded={isOpen}
        className="h-11 cursor-pointer rounded-md bg-background"
        role="combobox"
        value={displayValue}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => (current + 1) % options.length) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => (current - 1 + options.length) % options.length) }
          if (event.key === "Enter") { event.preventDefault(); selectOption(activeIndex) }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false) }
        }}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {options.map((option, index) => {
            const label = index === 0 ? `Auto - ${modeLabel(mode)}` : option.label
            const isSelected = index === 0 ? !override : override && option.value === mode
            return (
              <button key={`${option.label}-${index}`} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectOption(index) }}>
                <span>{label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function PreviousGeneratedCard({ isDropping, onDrop, selectedItem, serializations }: { isDropping: boolean; onDrop(serialization: StockSerialization): void; selectedItem: StockLedgerReceiptIntakeItem | null; serializations: StockSerialization[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const rows = serializations.flatMap((serialization) => serialization.items.map((item) => ({ item, serialization })))
  const totalCount = rows.length
  const verifiedCount = rows.filter((row) => Boolean(row.item.is_verified)).length
  const inwardQuantity = selectedItem?.quantity ?? serializations.reduce((total, item) => Math.max(total, item.expected_quantity), 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const pageIds = pageRows.map((row) => row.item.uuid)
  const selectedRows = rows.filter((row) => selectedIds.has(row.item.uuid))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  function toggleItem(item: StockSerializationItem, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(item.uuid)
      else next.delete(item.uuid)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      pageIds.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  return (
    <Card className="rounded-md">
      <CardContent className="space-y-3 p-0">
        {rows.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Purchase inward" value={inwardQuantity} />
                <StatusPill label="Generated" value={totalCount} />
                <StatusPill label="Verified" value={verifiedCount} tone={verifiedCount === totalCount ? "success" : "muted"} />
              </div>
              <Button disabled={!selectedRows.length} type="button" variant="outline" className="rounded-md" onClick={() => printBarcodeLabels(selectedRows.map((row) => row.item), selectedRows[0].serialization)}>
                <Printer className="size-4" />Print selected
              </Button>
            </div>
            <div className="overflow-x-auto border-y border-border/70">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <Header><Input aria-label="Select visible labels" checked={allPageSelected} className="size-4" type="checkbox" onChange={(event) => togglePage(event.target.checked)} /></Header>
                    <Header>Batch</Header>
                    <Header>Serial</Header>
                    <Header>Barcode</Header>
                    <Header>Status</Header>
                    <Header className="text-right">Action</Header>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ item, serialization }) => {
                    const isPosted = serialization.status === "posted" || Boolean(item.stock_movement_id)
                    return (
                      <tr key={item.uuid} className="border-t border-border/60">
                        <td className="px-3 py-2"><Input aria-label={`Select ${item.barcode_value}`} checked={selectedIds.has(item.uuid)} className="size-4" type="checkbox" onChange={(event) => toggleItem(item, event.target.checked)} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{item.batch_no ?? serialization.batch_no ?? "-"}</td>
                        <td className="px-3 py-2 font-medium">{item.serial_no}</td>
                        <td className="px-3 py-2 font-mono text-xs">{item.barcode_value}</td>
                        <td className="px-3 py-2">{item.is_verified ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><Check className="size-3" />Verified</span> : <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Pending</span>}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button aria-label={`Print ${item.barcode_value}`} title="Print label" type="button" size="icon" variant="outline" className="size-8 rounded-md transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary" onClick={() => printBarcodeLabels([item], serialization)}><Printer className="size-3.5" /></Button>
                            <Button aria-label={`Drop ${item.barcode_value}`} title="Drop generated labels" disabled={isPosted || isDropping} type="button" size="icon" variant="outline" className="size-8 rounded-md transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:hover:border-border disabled:hover:bg-background disabled:hover:text-muted-foreground" onClick={() => onDrop(serialization)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <MasterListPaginationCard
                page={safePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[25, 50, 100, 200, 500]}
                showingLabel={buildMasterListShowingLabel({ page: safePage, pageSize: rowsPerPage, totalCount })}
                singularLabel="labels"
                totalCount={totalCount}
                totalPages={totalPages}
                onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                onPageChange={setCurrentPage}
                onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onRowsPerPageChange={(value) => {
                  setRowsPerPage(value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </>
        ) : <div className="p-5 text-sm text-muted-foreground">No previous generated barcodes for this product.</div>}
      </CardContent>
    </Card>
  )
}

function StatusPill({ label, tone = "muted", value }: { label: string; tone?: "muted" | "success"; value: number }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
      tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border/70 bg-muted/35 text-muted-foreground",
    )}>
      <span>{label}</span>
      <span className={cn("font-semibold", tone === "success" ? "text-emerald-900" : "text-foreground")}>{value}</span>
    </div>
  )
}

function printBarcodeLabels(items: StockSerializationItem[], serialization: StockSerialization) {
  if (!items.length) return
  const labelHtml = items.map((item) => `
    <div class="label">
      <div class="product">${escapeHtml(serialization.product_name)}</div>
      <div class="barcode">${escapeHtml(item.barcode_value)}</div>
      <div class="meta">Batch: ${escapeHtml(item.batch_no ?? "-")} &nbsp; Serial: ${escapeHtml(item.serial_no)}</div>
    </div>
  `).join("")
  const printWindow = window.open("", "_blank", "width=900,height=700")
  if (!printWindow) {
    window.print()
    return
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          @page { size: auto; margin: 8mm; }
          body { margin: 0; font-family: Arial, sans-serif; color: #000; }
          .sheet { display: grid; grid-template-columns: repeat(3, 64mm); gap: 4mm; padding: 2mm; }
          .label { border: 1px solid #111; min-height: 28mm; padding: 3mm; box-sizing: border-box; page-break-inside: avoid; }
          .product { font-size: 10px; font-weight: 700; margin-bottom: 2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .barcode { font-family: "Courier New", monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px; text-align: center; border: 1px solid #111; padding: 2mm 1mm; }
          .meta { margin-top: 2mm; font-size: 9px; }
        </style>
      </head>
      <body><div class="sheet">${labelHtml}</div></body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;")
}

function modeLabel(mode: StockSerializationMode) {
  return mode === "full" ? "Full" : "Partial"
}

function PurchaseReceiptAutocomplete({ label, onChange, options, value }: { label: string; onChange(receipt: PurchaseReceiptEntry | null): void; options: PurchaseReceiptEntry[]; value: string }) {
  const selectedReceipt = options.find((receipt) => receipt.uuid === value) ?? null
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedReceipt ? purchaseReceiptLabel(selectedReceipt) : "")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((receipt) => purchaseReceiptLabel(receipt).toLowerCase().includes(normalizedQuery))
  const exactOption = options.find((receipt) => purchaseReceiptLabel(receipt).toLowerCase() === normalizedQuery)

  function resetQuery() {
    setQuery(selectedReceipt ? purchaseReceiptLabel(selectedReceipt) : "")
  }

  function selectReceipt(receipt: PurchaseReceiptEntry) {
    setQuery(purchaseReceiptLabel(receipt))
    onChange(receipt)
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) resetQuery()
  }, [isOpen, selectedReceipt])

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label>{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        className="h-11 rounded-md"
        placeholder="Search purchase receipt"
        role="combobox"
        value={query}
        onBlur={() => {
          if (exactOption) {
            selectReceipt(exactOption)
            return
          }
          window.setTimeout(() => { setIsOpen(false); resetQuery() }, 120)
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          const match = options.find((receipt) => purchaseReceiptLabel(receipt).toLowerCase() === nextQuery.trim().toLowerCase())
          setQuery(nextQuery)
          setIsOpen(true)
          setActiveIndex(0)
          onChange(match ?? null)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0) }
          if (event.key === "Enter") { event.preventDefault(); if (filteredOptions[activeIndex]) selectReceipt(filteredOptions[activeIndex]) }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); resetQuery() }
        }}
      />
      {isOpen && filteredOptions.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((receipt, index) => {
            const isSelected = receipt.uuid === value
            return (
              <button key={receipt.uuid} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectReceipt(receipt) }}>
                <span className="min-w-0 truncate">{purchaseReceiptLabel(receipt)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function WarehouseAutocomplete({ onChange, session, value }: { onChange(id: string | null, name: string): void; session: AuthSession; value: string }) {
  return (
    <CommonRecordAutocompleteLookup
      allowCreate={false}
      label="Warehouse"
      moduleKey="warehouses"
      placeholder="Search warehouse"
      session={session}
      value={value}
      onChange={(id, record) => onChange(id === null ? null : String(id), record ? getCommonRecordName(record) : "")}
    />
  )
}

function purchaseReceiptLabel(receipt: PurchaseReceiptEntry) {
  return [receipt.entry_no, receipt.supplier_name, receipt.entry_date].filter(Boolean).join(" - ")
}

function SerialTable({ serialization }: { serialization: StockSerialization }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const totalCount = serialization.items.length
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const pageItems = serialization.items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border-y border-border/70">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50"><tr><Header>Serial</Header><Header>Batch</Header><Header>Barcode</Header><Header className="text-right">Qty</Header><Header>Status</Header></tr></thead>
          <tbody>
            {pageItems.map((item) => (
              <tr key={item.uuid} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">{item.serial_no}</td>
                <td className="px-3 py-2 text-muted-foreground">{item.batch_no ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.barcode_value}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2">{item.is_verified ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><Check className="size-3" />Verified</span> : <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Pending</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MasterListPaginationCard
        page={safePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100, 200, 500]}
        showingLabel={buildMasterListShowingLabel({ page: safePage, pageSize: rowsPerPage, totalCount })}
        singularLabel="labels"
        totalCount={totalCount}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
      />
    </div>
  )
}

function LiveStockTable({ balances }: { balances: Array<{ id: number; product_name: string; warehouse_name: string | null; batch_no: string | null; serial_no: string | null; barcode_value: string | null; quantity_available: number }> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/50"><tr><Header>Product</Header><Header>Warehouse</Header><Header>Batch</Header><Header>Serial</Header><Header>Barcode</Header><Header className="text-right">Available</Header></tr></thead>
        <tbody>
          {balances.map((balance) => (
            <tr key={balance.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{balance.product_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{balance.warehouse_name ?? "-"}</td>
              <td className="px-3 py-2">{balance.batch_no ?? "-"}</td>
              <td className="px-3 py-2">{balance.serial_no ?? "-"}</td>
              <td className="px-3 py-2 font-mono text-xs">{balance.barcode_value ?? "-"}</td>
              <td className="px-3 py-2 text-right">{balance.quantity_available}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {balances.length ? null : <div className="p-5 text-sm text-muted-foreground">No live stock posted yet.</div>}
    </div>
  )
}

function SettingsFormatField({ helper, label, onChange, value }: { helper: string; label: string; onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input className="h-11 rounded-md font-mono text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="text-xs text-muted-foreground">{helper}</div>
    </div>
  )
}

function Field({ label, onChange, readOnly = false, value }: { label: string; onChange(value: string): void; readOnly?: boolean; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-11 rounded-md" readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function normalizeSerialFormat(value: string) {
  return value.replaceAll("{serial4}", "{####}")
}

function renderSerialPreview(format: string, sequence: number) {
  return normalizeSerialFormat(format)
    .replace(/\{(#+)\}/g, (_match, hashes: string) => String(sequence).padStart(hashes.length, "0"))
    .replaceAll("{serial}", String(sequence))
}

function renderBatchPreview(format: string) {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const week = currentStockWeek()
  return format.replaceAll("{yy}", year).replaceAll("{week}", week)
}

function currentStockWeek() {
  const now = new Date()
  return String(Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, "0")
}

function renderBarcodePreview(format: { barcode_format: string; batch_format: string; serial_format: string }) {
  return format.barcode_format
    .replaceAll("{productCode}", "P001")
    .replaceAll("{batchNo}", renderBatchPreview(format.batch_format))
    .replaceAll("{serialNo}", renderSerialPreview(format.serial_format, 1))
}
