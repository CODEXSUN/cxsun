import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Building2, Eye, FileText, IndianRupee, MessageSquareText, RefreshCw, Search, Send, Users } from "lucide-react"
import { adminApi } from "../api"

type Row = Record<string, unknown>

const rfqStatuses = ["under_review", "open", "matched", "quoted", "negotiation", "closed", "cancelled", "expired", "archived"]

export function RfqModerationPage({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [detail, setDetail] = useState<Row | null>(null)
  const [selectedUuid, setSelectedUuid] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [privacy, setPrivacy] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const query = new URLSearchParams({ limit: "100" })
      if (search.trim()) query.set("search", search.trim())
      if (status) query.set("status", status)
      if (privacy) query.set("privacy", privacy)
      const result = await adminApi<{ records: Row[] }>(`/rfqs?${query}`)
      setRows(result.records)
    } finally {
      setLoading(false)
    }
  }

  async function inspect(uuid: string) {
    setSelectedUuid(uuid)
    setLoading(true)
    try { setDetail(await adminApi<Row>(`/rfqs/${uuid}`)) } finally { setLoading(false) }
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [status, privacy])

  if (selectedUuid && detail) {
    return <RfqReview detail={detail} onBack={() => { setDetail(null); setSelectedUuid("") }} onNotice={onNotice} onReload={() => inspect(selectedUuid)} />
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    load().catch(() => setLoading(false))
  }

  return (
    <section className="rfq-moderation-page">
      <header className="company-page-header">
        <div><small>Marketplace / RFQs</small><h1>RFQ moderation</h1><p>Review buyer requirements, privacy, supplier response, and marketplace status.</p></div>
        <button onClick={() => load()} type="button"><RefreshCw size={16} /> Refresh</button>
      </header>
      <form className="company-list-tools" onSubmit={submitSearch}>
        <label className="company-search"><Search size={17} /><input aria-label="Search RFQs" onChange={(event) => setSearch(event.target.value)} placeholder="Search requirement title" value={search} /></label>
        <select aria-label="RFQ status" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{rfqStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
        <select aria-label="RFQ privacy" onChange={(event) => setPrivacy(event.target.value)} value={privacy}><option value="">All visibility</option><option value="public">Public</option><option value="matched">Matched suppliers</option><option value="private">Private</option></select>
        <button type="submit">Search</button>
      </form>
      <div className="company-table-wrap rfq-table-wrap">
        <table>
          <thead><tr><th>Requirement</th><th>Buyer</th><th>Quantity</th><th>Visibility</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={text(row.uuid)}><td><strong>{text(row.title)}</strong><small>{text(row.uuid)}</small></td><td><strong>{text(row.buyer_name)}</strong><small>{text(row.buyer_email)}</small></td><td>{number(row.quantity)} {text(row.unit)}</td><td><span className="company-source">{label(text(row.privacy))}</span></td><td><Status value={text(row.status)} /></td><td>{formatDate(row.created_at)}</td><td><button aria-label={`View ${text(row.title)}`} onClick={() => inspect(text(row.uuid))} title="View RFQ" type="button"><Eye size={16} /></button></td></tr>)}</tbody>
        </table>
        {loading ? <div className="company-empty">Loading RFQs...</div> : null}
        {!loading && !rows.length ? <div className="company-empty">No RFQs match these filters.</div> : null}
      </div>
      <footer className="company-list-footer"><span>Total RFQs: <strong>{rows.length}</strong></span><span>Showing up to 100 records</span></footer>
    </section>
  )
}

function RfqReview({ detail, onBack, onNotice, onReload }: { detail: Row; onBack(): void; onNotice(message: string): void; onReload(): Promise<void> }) {
  const [decision, setDecision] = useState(text(detail.status) || "under_review")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const quotes = array(detail.quotes)
  const inquiries = array(detail.inquiries)
  const buyerCompany = object(detail.buyerCompany)
  const certifications = jsonArray(detail.certifications)
  const attachments = jsonArray(detail.attachments)

  async function saveDecision() {
    setSaving(true)
    try {
      await adminApi(`/rfqs/${detail.uuid}/status`, { method: "PATCH", body: JSON.stringify({ notes, status: decision }) })
      await onReload()
      setNotes("")
      onNotice(`RFQ moved to ${label(decision)}.`)
    } finally { setSaving(false) }
  }

  return (
    <section className="rfq-review-page">
      <header className="company-page-header">
        <div className="company-title-row"><button aria-label="Back to RFQs" className="company-back" onClick={onBack} title="Back" type="button"><ArrowLeft size={18} /></button><div><small>RFQ review / {text(detail.uuid)}</small><h1>{text(detail.title)}</h1><p>{text(detail.category_name) || "Uncategorised requirement"}</p></div></div>
        <Status value={text(detail.status)} />
      </header>

      <div className="company-review-summary">
        <Summary icon={Users} label="Buyer" value={text(detail.buyer_name) || "Unknown"} />
        <Summary icon={FileText} label="Quantity" value={`${number(detail.quantity)} ${text(detail.unit)}`.trim()} />
        <Summary icon={IndianRupee} label="Target" value={money(detail.target_price, text(detail.currency))} />
        <Summary icon={Send} label="Supplier quotes" value={String(quotes.length)} />
      </div>

      <div className="rfq-review-grid">
        <ReviewSection title="Requirement">
          <p className="rfq-description">{text(detail.description) || "No detailed requirement supplied."}</p>
          <Details values={[
            ["Category", detail.category_name], ["Quantity", `${number(detail.quantity)} ${text(detail.unit)}`.trim()],
            ["Target price", money(detail.target_price, text(detail.currency))], ["Delivery date", formatDate(detail.delivery_date)],
            ["Delivery location", detail.delivery_location], ["Visibility", label(text(detail.privacy))],
            ["Created", formatDate(detail.created_at)], ["Expires", formatDate(detail.expires_at)],
          ]} />
          <TagList labelText="Required certifications" values={certifications.map(itemLabel)} />
        </ReviewSection>
        <ReviewSection title="Buyer context">
          <Details values={[
            ["Buyer", detail.buyer_name], ["Email", detail.buyer_email], ["Phone", detail.buyer_phone],
            ["Account role", label(text(detail.buyer_role))], ["Account status", label(text(detail.buyer_status))],
            ["Company", buyerCompany?.name], ["Company location", [text(buyerCompany?.city), text(buyerCompany?.state)].filter(Boolean).join(", ")],
            ["Company verification", label(text(buyerCompany?.verification_level) || "none")], ["Company trust", buyerCompany ? `${text(buyerCompany.trust_score) || "0"} / 100` : "-"],
          ]} />
        </ReviewSection>
      </div>

      <ReviewSection title={`Attachments (${attachments.length})`}>
        <div className="rfq-attachments">{attachments.map((item, index) => { const record = object(item); const url = text(record?.url) || text(item); return url ? <a href={url} key={`${url}-${index}`} rel="noreferrer" target="_blank"><FileText size={16} /><span>{text(record?.name) || `Attachment ${index + 1}`}</span></a> : null })}{!attachments.length ? <span>No attachments supplied.</span> : null}</div>
      </ReviewSection>

      <ReviewSection title={`Supplier quotations (${quotes.length})`}>
        <div className="rfq-quotes-table"><table><thead><tr><th>Supplier</th><th>Price / unit</th><th>Total</th><th>Quantity</th><th>Lead time</th><th>Valid until</th><th>Status</th></tr></thead><tbody>{quotes.map((quote) => <tr key={text(quote.uuid)}><td><strong>{text(quote.supplier_company_name)}</strong><small>{text(quote.supplier_city)} · Trust {text(quote.supplier_trust_score) || "0"}</small></td><td>{money(quote.price_per_unit, text(quote.currency))}</td><td><strong>{money(quote.total_amount, text(quote.currency))}</strong></td><td>{number(quote.quantity)}</td><td>{text(quote.lead_time) || "-"}</td><td>{formatDate(quote.validity_date)}</td><td><Status value={text(quote.status)} /></td></tr>)}</tbody></table>{!quotes.length ? <div className="company-empty">No supplier quotation received.</div> : null}</div>
      </ReviewSection>

      <ReviewSection title={`Lead activity (${inquiries.length})`}>
        <div className="rfq-inquiry-list">{inquiries.map((inquiry) => <article key={text(inquiry.uuid)}><MessageSquareText size={18} /><div><strong>{text(inquiry.name)}</strong><small>{text(inquiry.company_name)} · {text(inquiry.email)}</small><p>{text(inquiry.message)}</p></div><Status value={text(inquiry.status)} /></article>)}{!inquiries.length ? <div className="company-empty">No related inquiries.</div> : null}</div>
      </ReviewSection>

      <section className="company-decision-panel">
        <div><small>Audited decision</small><h2>RFQ lifecycle</h2><p>Moderate visibility and lifecycle without altering the buyer's requirement.</p></div>
        <label>Status<select onChange={(event) => setDecision(event.target.value)} value={decision}>{rfqStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label>Review notes<textarea onChange={(event) => setNotes(event.target.value)} placeholder="Moderation reason or internal follow-up note" rows={3} value={notes} /></label>
        <button className="primary" disabled={saving} onClick={saveDecision} type="button">{saving ? "Saving..." : "Save decision"}</button>
      </section>
    </section>
  )
}

function ReviewSection({ children, title }: { children: ReactNode; title: string }) { return <section className="company-review-section"><h2>{title}</h2>{children}</section> }
function Summary({ icon: Icon, label: caption, value }: { icon: typeof Building2; label: string; value: string }) { return <article><span><Icon size={19} /></span><div><small>{caption}</small><strong>{value}</strong></div></article> }
function Details({ values }: { values: Array<[string, unknown]> }) { return <dl className="company-details">{values.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{text(value) || "-"}</dd></div>)}</dl> }
function TagList({ labelText, values }: { labelText: string; values: string[] }) { return <div className="rfq-tag-group"><small>{labelText}</small><div className="company-chips">{values.length ? values.map((value) => <span key={value}>{value}</span>) : <small>None specified</small>}</div></div> }
function Status({ value }: { value: string }) { return <span className={`company-status is-${value || "unknown"}`}>{label(value || "unknown")}</span> }

function array(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === "object")) : [] }
function object(value: unknown): Row | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null }
function text(value: unknown) { return value == null ? "" : String(value) }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed.toLocaleString("en-IN") : "-" }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function formatDate(value: unknown) { const raw = text(value); if (!raw) return "-"; const date = new Date(raw); return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }
function money(value: unknown, currency = "INR") { const amount = Number(value); return Number.isFinite(amount) ? new Intl.NumberFormat("en-IN", { currency: currency || "INR", maximumFractionDigits: 2, style: "currency" }).format(amount) : "-" }
function jsonArray(value: unknown): unknown[] { if (Array.isArray(value)) return value; const raw = text(value); if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
function itemLabel(value: unknown) { const record = object(value); return text(record?.name) || text(record?.label) || text(record?.type) || text(value) }
