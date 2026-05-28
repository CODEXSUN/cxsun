import type { ReactNode } from "react"
import type { CompanyRecord } from "src/features/company/company-client"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import type { LetterheadSettings } from "src/features/settings/software-settings"
import { MainPrintTemplate } from "./main-print-template"
import { getDeliveryNotePrintLinePlan } from "./delivery-note-print-line-plan"
import type { DeliveryNoteEntry, DeliveryNoteEntryItem } from "./delivery-note-client"

const tableClass = "w-full border-collapse border border-gray-400"
const baseCell = "border-r border-gray-400 align-top p-[3px]"
const itemCell = `${baseCell} h-[26px] border-b-4 border-double border-gray-400 p-0 text-center text-[9px] leading-none`
const lineItemCell = `${baseCell} h-[28px] text-center text-[9px] leading-[1.08]`
const totalItemCell = `${baseCell} h-[18px] border-y border-gray-400 text-center text-[9px] leading-none`
export type DeliveryNotePrintCopy = "duplicate" | "original" | "triplicate"
export interface DeliveryNotePrintAddressLabels {
  cities(value: unknown): string
  countries(value: unknown): string
  districts(value: unknown): string
  pincodes(value: unknown): string
  states(value: unknown): string
}
export interface DeliveryNotePrintPartyDetails {
  addressLine: string
  gstin: string
  locationLine: string
  stateCode: string
  stateName: string
}

export function DeliveryNoteEntryDocument({
  addressLabels,
  billingParty,
  company,
  copy = "original",
  customTerms,
  documentTitle = "DELIVERY NOTE",
  letterheadSettings,
  record,
  showColour = false,
  showDc = true,
  showLogo = true,
  showPo = true,
  shippingParty,
  showSize = false,
}: {
  readonly addressLabels?: DeliveryNotePrintAddressLabels
  readonly billingParty?: DeliveryNotePrintPartyDetails | null
  readonly company?: CompanyRecord | null
  readonly copy?: DeliveryNotePrintCopy
  readonly customTerms?: string | null
  readonly documentTitle?: string
  readonly letterheadSettings?: Partial<LetterheadSettings>
  readonly record: DeliveryNoteEntry
  readonly showColour?: boolean
  readonly showDc?: boolean
  readonly showLogo?: boolean
  readonly showPo?: boolean
  readonly shippingParty?: DeliveryNotePrintPartyDetails | null
  readonly showSize?: boolean
}) {
  const itemColumns = printItemColumns({ showColour, showDc, showPo, showSize })
  const preQtyColumnCount = itemColumns.findIndex((column) => column.key === "quantity")
  const itemLinePlan = getDeliveryNotePrintLinePlan(record.items)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "CXSun Tenant Company"
  const termsLines = DeliveryNotePrintTerms(record.terms || customTerms)

  return (
    <MainPrintTemplate>
      <div className="grid grid-cols-[1fr_auto_1fr] p-px text-[9px]">
        <span />
        <span className="text-[12px] font-bold">{documentTitle}</span>
        <span className="text-right">{DeliveryNotePrintCopyLabel(copy)}</span>
      </div>
      <table className={`${tableClass} border-b-0`}>
        <tbody>
          <tr>
            <td className={`${baseCell} border-r-0 p-0 align-middle`} colSpan={2}>
              <LetterheadBuilder addressLabels={addressLabels} company={company ?? null} settings={letterheadSettings} showLogo={showLogo} />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={tableClass}>
        <tbody>
          <tr>
            <td className={`${baseCell} border-t border-gray-400 p-[5px]`}>
              <BillDetailsBlock lines={[
                { label: "Delivery No:", value: record.entry_no, strong: true },
                { label: "Delivery Date:", value: formatDate(record.entry_date), strong: true },
              ]} />
            </td>
            <td className={`${baseCell} border-t border-gray-400 border-r-0 p-[5px]`}>
              <BillDetailsBlock lines={[
                { label: "Work Order No:", value: record.reference_no ?? "", strong: true },
              ]} />
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[74px] w-1/2 border-y border-gray-400 px-2.5 pb-2 pt-1 leading-tight`}>
              <PartyAddressBlock
                address={record.billing_address}
                details={billingParty}
                gstin={record.supplier_gstin}
                label="Supplier (Bill from)"
                partyName={record.supplier_name}
                stateCode={record.supplier_state_code}
                stateName={record.supplier_state_name}
              />
            </td>
            <td className={`${baseCell} h-[74px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 pb-2 pt-1 leading-tight`}>
              <PartyAddressBlock
                address={record.shipping_address ?? record.billing_address}
                details={shippingParty ?? billingParty}
                gstin={record.supplier_gstin}
                label="Supplier (Receipt to)"
                partyName={record.supplier_name}
                stateCode={record.supplier_state_code}
                stateName={record.supplier_state_name}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`${tableClass} border-t-0`} data-print-template={itemLinePlan.requiresTwoPageTemplate ? "two-page-required" : "single-page"}>
        <thead>
          <tr className="bg-gray-50">
            {itemColumns.map((header) => (
              <th key={header.label} className={`${itemCell} ${header.widthClass}`}>
                <span className="flex h-[26px] items-center justify-center">{header.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {itemColumns.map((column, index) => (
              <td key={`item-spacer-${column.key}`} className={`${baseCell} h-[2px] p-0 text-[1px] leading-none ${index === itemColumns.length - 1 ? "border-r-0" : ""}`}>&nbsp;</td>
            ))}
          </tr>
          {itemLinePlan.rows.map((row) => row.kind === "item"
            ? <DeliveryNotePrintItemRow key={`item-${row.index}`} columns={itemColumns} index={row.index} item={row.item} />
            : <BlankDeliveryNotePrintItemRow key={`blank-${row.index}`} columns={itemColumns} />)}
          <tr>
            {itemColumns.map((column, index) => (
              <td key={`item-bottom-spacer-${column.key}`} className={`${baseCell} h-[2px] p-0 text-[1px] leading-none ${index === itemColumns.length - 1 ? "border-r-0" : ""}`}>&nbsp;</td>
            ))}
          </tr>
          <tr>
            {preQtyColumnCount > 1 ? (
              <>
                <td className={`${totalItemCell} text-left text-[8px]`}>E&amp;OE</td>
                <td className={`${totalItemCell} font-bold`} colSpan={preQtyColumnCount - 1}>Total</td>
              </>
            ) : (
              <td className={`${totalItemCell} font-bold`}>Total</td>
            )}
            <td className={totalItemCell}>{sumQty(record.items)}</td>
            <td className={`${totalItemCell} border-r-0`}>&nbsp;</td>
          </tr>
          <tr>
            <td className={`${baseCell} border-r-0 p-0 leading-tight`} colSpan={itemColumns.length}>
              <div className="min-h-[96px] p-1.5 text-[8px] leading-[1.15]">
                <div>This delivery note records material delivery only. Pricing is retained for reference and does not post finance.</div>
                <div className="mt-2 space-y-0.5 font-bold">
                  {termsLines.map((line) => <div key={line}>* {line}</div>)}
                </div>
              </div>
              <div className="grid h-[92px] grid-cols-[1fr_1fr] border-t border-gray-400 text-[9px]">
                <div className="p-2">Receiver Sign</div>
                <div className="border-l border-gray-400 p-2">
                  <div className="font-bold">For {companyName}</div>
                  <div className="mt-14 font-bold">Authorised Signatory</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="px-2 py-0.5 text-left text-[8px] font-bold">Subject to Tiruppur Jurisdiction</div>
    </MainPrintTemplate>
  )
}

type PrintItemColumnKey = "colour" | "hsn" | "poDc" | "product" | "quantity" | "rate" | "serial" | "size"

function printItemColumns(settings: { showColour: boolean; showDc: boolean; showPo: boolean; showSize: boolean }) {
  const showPoDc = settings.showPo || settings.showDc
  return [
    { key: "serial", label: "S.no", widthClass: "w-[28px] text-[8px]" },
    { key: "product", label: "Particulars", widthClass: settings.showColour || settings.showSize || showPoDc ? "w-[260px]" : "w-[380px]" },
    { key: "hsn", label: "HSN", widthClass: "w-[48px]" },
    ...(settings.showColour ? [{ key: "colour" as const, label: "Colour", widthClass: "w-[54px]" }] : []),
    ...(settings.showSize ? [{ key: "size" as const, label: "Size", widthClass: "w-[42px]" }] : []),
    ...(showPoDc ? [{ key: "poDc" as const, label: [settings.showPo ? "PO" : null, settings.showDc ? "DC" : null].filter(Boolean).join(" / "), widthClass: "w-[58px]" }] : []),
    { key: "quantity", label: "Qty", widthClass: "w-[42px]" },
    { key: "rate", label: "Price", widthClass: "w-[70px]" },
  ] satisfies Array<{ key: PrintItemColumnKey; label: string; widthClass: string }>
}

function DeliveryNotePrintItemRow({ columns, index, item }: { columns: ReturnType<typeof printItemColumns>; index: number; item: DeliveryNoteEntryItem }) {
  const cells: Record<PrintItemColumnKey, ReactNode> = {
    colour: item.colour ?? "",
    hsn: item.hsn_code ?? "",
    poDc: [item.po_no, item.dc_no].filter(Boolean).join(" / "),
    product: (
      <div className="overflow-hidden leading-[1.18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        <span className="font-bold">{item.product_name}</span>
        {item.description ? <><br /><span className="inline-block pt-px">{item.description}</span></> : null}
      </div>
    ),
    quantity: item.quantity,
    rate: money(Number(item.rate || 0)),
    serial: index + 1,
    size: item.size ?? "",
  }
  const rightAlignedKeys = new Set<PrintItemColumnKey>(["rate"])
  return (
    <tr>
      {columns.map((column, columnIndex) => <td key={column.key} className={`${lineItemCell} ${column.key === "product" ? "break-words text-left" : ""} ${rightAlignedKeys.has(column.key) ? "text-right" : ""} ${columnIndex === columns.length - 1 ? "border-r-0" : ""}`}>{cells[column.key]}</td>)}
      {columns.length === 0 ? null : null}
    </tr>
  )
}

function BlankDeliveryNotePrintItemRow({ columns }: { columns: ReturnType<typeof printItemColumns> }) {
  return <tr>{columns.map((column, index) => <td key={`${column.label}-${index}`} className={index === columns.length - 1 ? `${lineItemCell} border-r-0` : lineItemCell}>&nbsp;</td>)}</tr>
}

function BillDetailsBlock({ labelWidthClassName = "grid-cols-[108px_1fr]", lines }: { labelWidthClassName?: string; lines: ReadonlyArray<{ label: string; strong?: boolean; value: ReactNode }> }) {
  return <div className="space-y-0.5">{lines.map((line) => <div key={line.label} className={`grid ${labelWidthClassName} gap-2`}><span className="whitespace-nowrap">{line.label}</span><span className={line.strong ? "font-bold" : ""}>{line.value || "-"}</span></div>)}</div>
}

function PartyAddressBlock({
  address,
  details,
  gstin,
  label,
  partyName,
  stateCode,
  stateName,
}: {
  address: string | null | undefined
  details?: DeliveryNotePrintPartyDetails | null
  gstin?: string | null
  label: string
  partyName: string
  stateCode?: string | null
  stateName?: string | null
}) {
  const fallback = parsePartyAddress(address)
  const gstinText = printableText(details?.gstin) || printableText(gstin) || fallback.gstin
  const stateNameText = printableText(details?.stateName) || printableText(stateName) || fallback.stateName
  const stateCodeText = printableText(details?.stateCode) || printableText(stateCode) || fallback.stateCode
  const addressLineText = printableText(details?.addressLine) || fallback.addressLine
  const locationLineText = printableText(details?.locationLine) || fallback.locationLine
  return (
    <div className="leading-tight">
      <div>{label}</div>
      <div className="font-bold">M/s. {partyName}</div>
      <div>{addressLineText || "Address not set"}</div>
      {locationLineText ? <div>{locationLineText}</div> : null}
      <div className="grid grid-cols-[62px_1fr] gap-1"><span>GSTIN/UIN</span><span>: {gstinText}</span></div>
      <div className="grid grid-cols-[62px_1fr_70px_1fr] gap-1">
        <span>State Name</span>
        <span>: {stateNameText}</span>
        <span>State Code</span>
        <span>: {stateCodeText}</span>
      </div>
    </div>
  )
}

function sumQty(items: readonly DeliveryNoteEntryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString("en-IN")
}

function DeliveryNotePrintTerms(value?: string | null) {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.replace(/^\*\s*/, "").trim()).filter(Boolean)
  return lines.length ? lines : [
    "Goods delivered subject to customer acknowledgement and quantity, rate, and quality verification.",
    "Acceptance may be revised for shortage, damage, or mismatch found later.",
  ]
}

function DeliveryNotePrintCopyLabel(copy: DeliveryNotePrintCopy) {
  if (copy === "duplicate") return "Duplicate"
  if (copy === "triplicate") return "Office Copy"
  return "Original"
}

function parsePartyAddress(address: string | null | undefined) {
  const parts = String(address ?? "").split(",").map((part) => part.trim()).filter(Boolean)
  const pincode = parts.findLast((part) => /\b\d{6}\b/.test(part))?.match(/\b\d{6}\b/)?.[0] ?? ""
  const countryIndex = parts.findIndex((part) => part.toLowerCase() === "india")
  const stateName = countryIndex > 0 ? parts[countryIndex - 1] : parts.length >= 3 ? parts[parts.length - (pincode ? 3 : 2)] ?? "" : ""
  const addressLine = [parts[0], parts[1]].filter(Boolean).join(", ")
  const city = parts[2] ?? ""
  const district = parts[3] && parts[3] !== stateName ? parts[3] : ""
  const locationLine = [city, district].filter(Boolean).join(", ") + (pincode ? ` - ${pincode}` : "")

  return {
    addressLine,
    gstin: "",
    locationLine: locationLine.trim(),
    stateCode: "",
    stateName,
  }
}

function printableText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

