import { useMemo, type ReactNode } from "react"
import type { CompanyRecord } from "src/features/company/company-client"
import { MainPrintTemplate } from "./main-print-template"
import { getSalesPrintLinePlan } from "./sales-print-line-plan"
import type { SalesEntry, SalesEntryItem } from "./sales-client"

const tableClass = "w-full border-collapse border border-gray-400"
const baseCell = "border-r border-gray-400 align-top p-[3px]"
const itemCell = `${baseCell} h-[18px] border-b-4 border-double border-gray-400 text-center text-[9px] align-middle`
const lineItemCell = `${baseCell} h-[18px] text-center text-[9px] leading-[1.08]`
const totalItemCell = `${lineItemCell} border-y border-gray-400`
const times = "font-['Times_New_Roman']"

export type SalesPrintCopy = "duplicate" | "original" | "triplicate"

export function SalesInvoiceDocument({
  company,
  copy = "original",
  customTerms,
  documentTitle = "TAX INVOICE",
  record,
  showBankAccountNumber = true,
  showColour = false,
  showDc = true,
  showFooterDetails = true,
  showLogo = true,
  showPo = true,
  showQrAccountDetails = true,
  showSize = false,
}: {
  readonly company?: CompanyRecord | null
  readonly copy?: SalesPrintCopy
  readonly customTerms?: string | null
  readonly documentTitle?: string
  readonly record: SalesEntry
  readonly showBankAccountNumber?: boolean
  readonly showColour?: boolean
  readonly showDc?: boolean
  readonly showFooterDetails?: boolean
  readonly showLogo?: boolean
  readonly showPo?: boolean
  readonly showQrAccountDetails?: boolean
  readonly showSize?: boolean
}) {
  const totals = useMemo(() => calculatePrintTotals(record.items, Number(record.round_off ?? 0)), [record])
  const isCgstSgst = (record.place_of_supply ?? "cgst-sgst") !== "igst"
  const itemColumns = printItemColumns(isCgstSgst, { showColour, showDc, showPo, showSize })
  const preQtyColumnCount = itemColumns.findIndex((column) => column.key === "quantity")
  const itemLinePlan = getSalesPrintLinePlan(record.items)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "CXSun Tenant Company"
  const companyAddressLines = company ? companyAddress(company) : []
  const companyContactLine = company ? companyContact(company) : ""
  const companyBank = company ? primaryBankAccount(company) : null
  const termsLines = salesPrintTerms(customTerms || record.terms)

  return (
    <MainPrintTemplate>
      <div className="grid grid-cols-[1fr_auto_1fr] p-px text-[9px]">
        <span />
        <span className="text-[12px] font-bold">{documentTitle}</span>
        <span className="text-right">{salesPrintCopyLabel(copy)}</span>
      </div>
      <table className={`${tableClass} border-b-0`}>
        <tbody>
          <tr>
            <td className={`${baseCell} h-[112px] w-[130px] border-r-0 text-center align-middle`}>
              {showLogo ? <CompanyLogo company={company ?? null} companyName={companyName} /> : null}
            </td>
            <td className={`${baseCell} border-r-0 text-center leading-[1.55]`}>
              <div className={`${times} text-[32px] font-bold leading-tight`}>{companyName}</div>
              {companyAddressLines.map((line) => <div key={line} className={times}>{line}</div>)}
              {companyContactLine ? <div className={times}>{companyContactLine}</div> : null}
              {company?.gstinUin ? <div className={times}>GSTIN: {company.gstinUin}</div> : null}
            </td>
          </tr>
        </tbody>
      </table>
      <table className={tableClass}>
        <tbody>
          <tr>
            <td className={`${baseCell} border-t border-gray-400 p-[5px]`}>
              <BillDetailsBlock lines={[
                { label: "Invoice No:", value: record.invoice_no, strong: true },
                { label: "Date:", value: formatDate(record.invoice_date), strong: true },
                { label: "Reference:", value: record.reference_no ?? "" },
              ]} />
            </td>
            <td className={`${baseCell} border-t border-gray-400 border-r-0 p-[5px]`}>
              <IrnDetailsBlock record={record} />
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[68px] w-1/2 border-y border-gray-400 px-2.5 py-1 leading-tight`}>
              <PartyAddressBlock address={record.billing_address} label="Buyer (Bill to)" partyName={record.customer_name} />
            </td>
            <td className={`${baseCell} h-[68px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 py-1 leading-tight`}>
              <PartyAddressBlock address={record.shipping_address ?? record.billing_address} label="Buyer (Ship to)" partyName={record.customer_name} />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`${tableClass} border-t-0`} data-print-template={itemLinePlan.requiresTwoPageTemplate ? "two-page-required" : "single-page"}>
        <thead>
          <tr className="bg-gray-50">
            {itemColumns.map((header) => (
              <th key={header.label} className={`${itemCell} ${header.widthClass}`}>{header.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemLinePlan.rows.map((row) => row.kind === "item"
            ? <SalesPrintItemRow key={`item-${row.index}`} columns={itemColumns} index={row.index} item={row.item} />
            : <BlankSalesPrintItemRow key={`blank-${row.index}`} columns={itemColumns} />)}
          <tr>
            <td className={`${totalItemCell} text-right font-bold`} colSpan={Math.max(1, preQtyColumnCount)}>Total&nbsp;&nbsp;</td>
            <td className={totalItemCell}>{sumQty(record.items)}</td>
            <td className={`${totalItemCell} text-right`}>{money(totals.taxableAmount)}</td>
            {isCgstSgst ? (
              <>
                <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal / 2)}</td>
                <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal / 2)}</td>
              </>
            ) : <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal)}</td>}
            <td className={`${totalItemCell} border-r-0 text-right`}>{money(totals.grandTotal)}</td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[82px] border-r-0 p-2 leading-tight`} colSpan={itemColumns.length}>
              <div className="grid grid-cols-[1fr_185px] gap-3">
                <div>
                  <div className="font-bold">Amount in words</div>
                  <div>{amountInWords(totals.grandTotal)}</div>
                  {termsLines.length ? <div className="mt-2 font-bold">Terms &amp; Conditions</div> : null}
                  {termsLines.map((line) => <div key={line}>{line}</div>)}
                </div>
                <div className="border-l border-gray-400 pl-2">
                  <SummaryLine label="Taxable" value={money(totals.taxableAmount)} />
                  <SummaryLine label="GST" value={money(totals.gstTotal)} />
                  <SummaryLine label="Round off" value={money(record.round_off)} />
                  <SummaryLine label="Grand total" value={money(totals.grandTotal)} strong />
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[82px] p-2 leading-tight`} colSpan={Math.max(1, Math.floor(itemColumns.length / 2))}>
              {showFooterDetails && companyBank ? (
                <div>
                  <div className="font-bold">Bank Details</div>
                  <div>{companyBank.bankName}</div>
                  {showBankAccountNumber ? <div>A/c: {companyBank.accountNumber}</div> : null}
                  <div>IFSC: {companyBank.ifsc}</div>
                  {showQrAccountDetails ? <div>{companyBank.branch}</div> : null}
                </div>
              ) : null}
            </td>
            <td className={`${baseCell} border-r-0 p-2 text-right align-bottom`} colSpan={Math.max(1, itemColumns.length - Math.floor(itemColumns.length / 2))}>
              <div className="mb-10 font-bold">For {companyName}</div>
              <div>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </MainPrintTemplate>
  )
}

type PrintItemColumnKey = "cgst" | "colour" | "igst" | "poDc" | "product" | "quantity" | "serial" | "sgst" | "size" | "taxable" | "total"

function printItemColumns(isCgstSgst: boolean, settings: { showColour: boolean; showDc: boolean; showPo: boolean; showSize: boolean }) {
  const showPoDc = settings.showPo || settings.showDc
  return [
    { key: "serial", label: "S.No", widthClass: "w-[28px]" },
    { key: "product", label: "Product / Description", widthClass: settings.showColour || settings.showSize || showPoDc ? "w-[220px]" : "w-[330px]" },
    ...(settings.showColour ? [{ key: "colour" as const, label: "Colour", widthClass: "w-[58px]" }] : []),
    ...(settings.showSize ? [{ key: "size" as const, label: "Size", widthClass: "w-[46px]" }] : []),
    ...(showPoDc ? [{ key: "poDc" as const, label: [settings.showPo ? "PO" : null, settings.showDc ? "DC" : null].filter(Boolean).join(" / "), widthClass: "w-[64px]" }] : []),
    { key: "quantity", label: "Qty", widthClass: "w-[50px]" },
    { key: "taxable", label: "Taxable", widthClass: "w-[72px]" },
    ...(isCgstSgst ? [{ key: "cgst" as const, label: "CGST", widthClass: "w-[62px]" }, { key: "sgst" as const, label: "SGST", widthClass: "w-[62px]" }] : [{ key: "igst" as const, label: "IGST", widthClass: "w-[72px]" }]),
    { key: "total", label: "Total", widthClass: "w-[82px]" },
  ] satisfies Array<{ key: PrintItemColumnKey; label: string; widthClass: string }>
}

function SalesPrintItemRow({ columns, index, item }: { columns: ReturnType<typeof printItemColumns>; index: number; item: SalesEntryItem }) {
  const taxable = itemTaxable(item)
  const gst = itemTax(item)
  const total = taxable + gst
  const cells: Record<PrintItemColumnKey, ReactNode> = {
    cgst: money(gst / 2),
    colour: item.colour ?? "",
    igst: money(gst),
    poDc: [item.po_no, item.dc_no].filter(Boolean).join(" / "),
    product: <><div className="font-bold">{item.product_name}</div>{item.description ? <div>{item.description}</div> : null}</>,
    quantity: item.quantity,
    serial: index + 1,
    sgst: money(gst / 2),
    size: item.size ?? "",
    taxable: money(taxable),
    total: money(total),
  }
  const rightAlignedKeys = new Set<PrintItemColumnKey>(["cgst", "igst", "sgst", "taxable", "total"])
  return (
    <tr>
      {columns.map((column, columnIndex) => <td key={column.key} className={`${lineItemCell} ${column.key === "product" ? "text-left" : ""} ${rightAlignedKeys.has(column.key) ? "text-right" : ""} ${columnIndex === columns.length - 1 ? "border-r-0" : ""}`}>{cells[column.key]}</td>)}
      {columns.length === 0 ? null : null}
    </tr>
  )
}

function BlankSalesPrintItemRow({ columns }: { columns: ReturnType<typeof printItemColumns> }) {
  return <tr>{columns.map((column, index) => <td key={`${column.label}-${index}`} className={index === columns.length - 1 ? `${lineItemCell} border-r-0` : lineItemCell}>&nbsp;</td>)}</tr>
}

function BillDetailsBlock({ labelWidthClassName = "grid-cols-[82px_1fr]", lines }: { labelWidthClassName?: string; lines: ReadonlyArray<{ label: string; strong?: boolean; value: ReactNode }> }) {
  return <div className="space-y-0.5">{lines.map((line) => <div key={line.label} className={`grid ${labelWidthClassName} gap-1`}><span>{line.label}</span><span className={line.strong ? "font-bold" : ""}>{line.value || "-"}</span></div>)}</div>
}

function PartyAddressBlock({ address, label, partyName }: { address: string | null | undefined; label: string; partyName: string }) {
  const details = parsePartyAddress(address)
  return (
    <div className="leading-tight">
      <div>{label}</div>
      <div className="font-bold">M/s. {partyName}</div>
      <div>{details.addressLine || "Address not set"}</div>
      {details.locationLine ? <div>{details.locationLine}</div> : null}
      <div className="grid grid-cols-[62px_1fr] gap-1"><span>GSTIN/UIN</span><span>: {details.gstin}</span></div>
      <div className="grid grid-cols-[62px_1fr_70px_1fr] gap-1">
        <span>State Name</span>
        <span>: {details.stateName}</span>
        <span>State Code</span>
        <span>: {details.stateCode}</span>
      </div>
    </div>
  )
}

function CompanyLogo({ company, companyName }: { company: CompanyRecord | null; companyName: string }) {
  const logo = company?.logos.find((item) => item.isActive && item.logoUrl)?.logoUrl
  if (logo) return <img src={logo} alt={companyName} className="mx-auto max-h-[92px] max-w-[112px] object-contain" />
  return <div className="mx-auto flex size-[92px] items-center justify-center rounded-[24px] border border-gray-400 bg-gray-500 text-center text-[26px] font-bold text-white">{companyName.slice(0, 2).toUpperCase()}</div>
}

function IrnDetailsBlock({ record }: { record: SalesEntry }) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[34px_1fr] gap-1">
        <span className="font-bold">IRN :</span>
        <span className="break-all font-bold leading-tight">{salesDocumentValue(record, "irn") || record.uuid}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
        <InlinePrintField label="Ack No.:" value={salesDocumentValue(record, "ack_no")} />
        <InlinePrintField label="Ack Date:" value={formatDate(salesDocumentValue(record, "ack_date"))} />
        <InlinePrintField label="E-Way Bill No.:" value={salesDocumentValue(record, "eway_bill_no")} />
        <InlinePrintField label="Date:" value={formatDate(salesDocumentValue(record, "eway_bill_date"))} />
      </div>
    </div>
  )
}

function InlinePrintField({ label, value }: { label: string; value: ReactNode }) {
  return <div className="grid grid-cols-[86px_1fr] gap-1"><span className="font-bold">{label}</span><span className="font-bold">{value || "-"}</span></div>
}

function SummaryLine({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <div className={strong ? "grid grid-cols-[1fr_70px] gap-2 font-bold" : "grid grid-cols-[1fr_70px] gap-2"}><span>{label}</span><span className="text-right">{value}</span></div>
}

function calculatePrintTotals(items: readonly SalesEntryItem[], roundOff: number) {
  const taxableAmount = items.reduce((sum, item) => sum + itemTaxable(item), 0)
  const gstTotal = items.reduce((sum, item) => sum + itemTax(item), 0)
  return { taxableAmount, gstTotal, grandTotal: taxableAmount + gstTotal + Number(roundOff || 0) }
}

function itemTaxable(item: SalesEntryItem) {
  return Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
}

function itemTax(item: SalesEntryItem) {
  return itemTaxable(item) * Number(item.tax_rate || 0) / 100
}

function sumQty(items: readonly SalesEntryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString("en-IN")
}

function companyAddress(company: CompanyRecord) {
  const address = company.addresses.find((item) => item.isDefault) ?? company.addresses[0]
  if (!address) return []
  return [[address.addressLine1, address.addressLine2].filter(Boolean).join(", "), [address.cityId, address.districtId, address.stateId, address.pincodeId].filter(Boolean).join(", ")].filter(Boolean)
}

function companyContact(company: CompanyRecord) {
  return [company.primaryPhone, company.primaryEmail, company.website].filter(Boolean).join(" | ")
}

function primaryBankAccount(company: CompanyRecord) {
  return company.bankAccounts.find((item) => item.isPrimary) ?? company.bankAccounts[0] ?? null
}

function salesPrintTerms(value?: string | null) {
  return String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function salesPrintCopyLabel(copy: SalesPrintCopy) {
  if (copy === "duplicate") return "Duplicate"
  if (copy === "triplicate") return "Office Copy"
  return "Original"
}

function salesDocumentValue(record: SalesEntry, key: string) {
  const value = (record as unknown as Record<string, unknown>)[key]
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value)
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

function amountInWords(value: number) {
  return `INR ${money(value)} only`
}
