import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, BadgeCheck, Building2, Eye, PackageSearch, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { adminApi } from "../api"

type Row = Record<string, unknown>

const publicationStatuses = ["under_review", "changes_requested", "approved", "published", "suspended", "archived"]

export function CompanyModerationPage({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [selectedUuid, setSelectedUuid] = useState("")
  const [detail, setDetail] = useState<Row | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [sourceType, setSourceType] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const query = new URLSearchParams({ limit: "100" })
      if (search.trim()) query.set("search", search.trim())
      if (status) query.set("status", status)
      if (sourceType) query.set("sourceType", sourceType)
      const result = await adminApi<{ records: Row[] }>(`/companies?${query}`)
      setRows(result.records)
    } finally {
      setLoading(false)
    }
  }

  async function inspect(uuid: string) {
    setSelectedUuid(uuid)
    setLoading(true)
    try {
      setDetail(await adminApi<Row>(`/companies/${uuid}`))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [status, sourceType])

  if (selectedUuid && detail) {
    return <CompanyReview detail={detail} onBack={() => { setDetail(null); setSelectedUuid("") }} onNotice={onNotice} onReload={() => inspect(selectedUuid)} />
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    load().catch(() => setLoading(false))
  }

  return (
    <section className="company-moderation-page">
      <header className="company-page-header">
        <div><small>Marketplace / Companies</small><h1>Company moderation</h1><p>Inspect supplier identity and provenance before approving public visibility.</p></div>
        <button onClick={() => load()} type="button"><RefreshCw size={16} /> Refresh</button>
      </header>
      <form className="company-list-tools" onSubmit={submitSearch}>
        <label className="company-search"><Search size={17} /><input aria-label="Search companies" onChange={(event) => setSearch(event.target.value)} placeholder="Search company name" value={search} /></label>
        <select aria-label="Publication status" onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="">All statuses</option>
          {["draft", "submitted", ...publicationStatuses].map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
        <select aria-label="Company source" onChange={(event) => setSourceType(event.target.value)} value={sourceType}>
          <option value="">All sources</option><option value="web">Web member</option><option value="billing_connector">Billing connector</option>
        </select>
        <button type="submit">Search</button>
      </form>
      <div className="company-table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Source</th><th>Location</th><th>Trust</th><th>Membership</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.uuid)}>
                <td><strong>{text(row.name)}</strong><small>{text(row.business_type) || "Business type not set"}</small></td>
                <td><span className="company-source">{row.source_type === "billing_connector" ? "Billing connector" : "Web member"}</span></td>
                <td>{[text(row.city), text(row.state)].filter(Boolean).join(", ") || "-"}</td>
                <td><strong>{text(row.trust_score) || "0"}</strong><small>{label(text(row.verification_level) || "none")}</small></td>
                <td>{label(text(row.membership_tier) || "free")}</td>
                <td><Status value={text(row.publication_status)} /></td>
                <td>{formatDate(row.updated_at)}</td>
                <td><button aria-label={`View ${text(row.name)}`} onClick={() => inspect(String(row.uuid))} title="View company" type="button"><Eye size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length ? <div className="company-empty">No companies match these filters.</div> : null}
        {loading ? <div className="company-empty">Loading companies...</div> : null}
      </div>
      <footer className="company-list-footer"><span>Total companies: <strong>{rows.length}</strong></span><span>Showing up to 100 records</span></footer>
    </section>
  )
}

function CompanyReview({ detail, onBack, onNotice, onReload }: { detail: Row; onBack(): void; onNotice(message: string): void; onReload(): Promise<void> }) {
  const [decision, setDecision] = useState(text(detail.publication_status) || "under_review")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const products = array(detail.products)
  const categories = array(detail.categories)
  const verifications = array(detail.verifications)
  const account = object(detail.account)
  const submission = object(detail.submission)

  async function saveDecision() {
    setSaving(true)
    try {
      await adminApi(`/companies/${detail.uuid}/status`, { method: "PATCH", body: JSON.stringify({ notes, status: decision }) })
      await onReload()
      setNotes("")
      onNotice(`Company moved to ${label(decision)}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="company-review-page">
      <header className="company-page-header">
        <div className="company-title-row">
          <button aria-label="Back to companies" className="company-back" onClick={onBack} title="Back" type="button"><ArrowLeft size={18} /></button>
          <div><small>Company review / {text(detail.uuid)}</small><h1>{text(detail.name)}</h1><p>{text(detail.legal_name) || text(detail.business_type) || "Marketplace supplier profile"}</p></div>
        </div>
        <Status value={text(detail.publication_status)} />
      </header>

      <div className="company-review-summary">
        <Summary icon={Building2} label="Source" value={detail.source_type === "billing_connector" ? "Billing connector" : "Web member"} />
        <Summary icon={ShieldCheck} label="Trust score" value={`${text(detail.trust_score) || "0"} / 100`} />
        <Summary icon={BadgeCheck} label="Verification" value={label(text(detail.verification_level) || "none")} />
        <Summary icon={PackageSearch} label="Products" value={String(products.length)} />
      </div>

      <div className="company-review-grid">
        <ReviewSection title="Business profile">
          <Details values={[
            ["Business type", detail.business_type], ["GSTIN", detail.gstin], ["IEC number", detail.iec_number],
            ["Established", detail.year_established], ["Employees", detail.employee_count], ["Membership", label(text(detail.membership_tier) || "free")],
          ]} />
          {text(detail.description) ? <p className="company-description">{text(detail.description)}</p> : null}
          <ChipList empty="No categories selected" rows={categories} valueKey="name" />
        </ReviewSection>
        <ReviewSection title="Contact and location">
          <Details values={[
            ["Email", detail.email], ["Phone", detail.phone], ["WhatsApp", detail.whatsapp], ["Website", detail.website],
            ["Contact person", detail.contact_person_name], ["Designation", detail.contact_person_designation],
            ["Contact email", detail.contact_person_email], ["Contact phone", detail.contact_person_phone],
            ["Address", detail.address], ["Location", [text(detail.city), text(detail.state), text(detail.pincode), text(detail.country)].filter(Boolean).join(", ")],
          ]} />
        </ReviewSection>
        <ReviewSection title="Factory and trade capability">
          <Details values={[
            ["Factory size", detail.factory_size], ["Monthly capacity", detail.monthly_capacity],
            ["Minimum order", detail.minimum_order_quantity], ["Lead time", detail.lead_time],
            ["Export markets", listText(detail.export_markets)], ["Certifications", listText(detail.certifications)],
          ]} />
        </ReviewSection>
        <ReviewSection title="Ownership and provenance">
          <Details values={[
            ["Source type", label(text(detail.source_type))], ["Source tenant", detail.source_tenant_id],
            ["External record", detail.external_record_uuid], ["Current revision", detail.current_revision_id],
            ["Member account", account?.name], ["Account email", account?.email], ["Account role", label(text(account?.role))],
            ["Email verified", formatDate(account?.email_verified_at)], ["Submission", submission?.uuid], ["Sync version", submission?.sync_version],
          ]} />
        </ReviewSection>
      </div>

      <ReviewSection title={`Products (${products.length})`}>
        <div className="company-related-table"><table><thead><tr><th>Product</th><th>SKU</th><th>Unit</th><th>MOQ</th><th>Lead time</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={text(product.uuid)}><td><strong>{text(product.name)}</strong><small>{text(product.fabric_details)}</small></td><td>{text(product.sku) || "-"}</td><td>{text(product.unit) || "-"}</td><td>{text(product.moq) || "-"}</td><td>{text(product.lead_time) || "-"}</td><td><Status value={text(product.publication_status)} /></td></tr>)}</tbody></table>{!products.length ? <div className="company-empty">No products submitted.</div> : null}</div>
      </ReviewSection>

      <ReviewSection title={`Verification requests (${verifications.length})`}>
        <div className="verification-review-list">{verifications.map((item) => <article key={text(item.uuid)}><div><strong>{label(text(item.level))}</strong><small>{formatDate(item.created_at)}</small></div><Status value={text(item.status)} /><p>{text(item.notes) || "No applicant notes."}</p><small>{documentCount(item.documents)} supporting document(s)</small></article>)}{!verifications.length ? <div className="company-empty">No verification requests submitted.</div> : null}</div>
      </ReviewSection>

      <section className="company-decision-panel">
        <div><small>Audited decision</small><h2>Publication review</h2><p>Profile fields remain supplier-owned. Record the moderation result and notes here.</p></div>
        <label>Status<select onChange={(event) => setDecision(event.target.value)} value={decision}>{publicationStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label>Review notes<textarea onChange={(event) => setNotes(event.target.value)} placeholder="Reason, missing evidence, or internal review note" rows={3} value={notes} /></label>
        <button className="primary" disabled={saving} onClick={saveDecision} type="button">{saving ? "Saving..." : "Save decision"}</button>
      </section>
    </section>
  )
}

function ReviewSection({ children, title }: { children: ReactNode; title: string }) {
  return <section className="company-review-section"><h2>{title}</h2>{children}</section>
}

function Summary({ icon: Icon, label: caption, value }: { icon: typeof Building2; label: string; value: string }) {
  return <article><span><Icon size={19} /></span><div><small>{caption}</small><strong>{value}</strong></div></article>
}

function Details({ values }: { values: Array<[string, unknown]> }) {
  return <dl className="company-details">{values.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{text(value) || "-"}</dd></div>)}</dl>
}

function ChipList({ empty, rows, valueKey }: { empty: string; rows: Row[]; valueKey: string }) {
  return <div className="company-chips">{rows.length ? rows.map((row) => <span key={text(row.uuid) || text(row[valueKey])}>{text(row[valueKey])}</span>) : <small>{empty}</small>}</div>
}

function Status({ value }: { value: string }) {
  return <span className={`company-status is-${value || "unknown"}`}>{label(value || "unknown")}</span>
}

function array(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === "object")) : [] }
function object(value: unknown): Row | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null }
function text(value: unknown) { return value == null ? "" : String(value) }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function formatDate(value: unknown) { const raw = text(value); if (!raw) return "-"; const date = new Date(raw); return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }
function listText(value: unknown) { if (Array.isArray(value)) return value.join(", "); const raw = text(value); if (!raw) return ""; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.join(", ") : raw } catch { return raw } }
function documentCount(value: unknown) { if (Array.isArray(value)) return value.length; try { const parsed = JSON.parse(text(value)); return Array.isArray(parsed) ? parsed.length : 0 } catch { return 0 } }
