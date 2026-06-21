import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type RfqCard = {
  uuid: string
  item_key: string
  eyebrow: string | null
  title: string
  summary: string | null
  body: string | null
  image_url: string | null
  target_url: string | null
  content: Record<string, unknown>
  sort_order: number
  status: string
  updated_at: string
}

type RfqSection = {
  uuid: string
  section_key: string
  section_type: string
  eyebrow: string | null
  title: string | null
  body: string | null
  settings: Record<string, unknown>
  sort_order: number
  status: string
  updated_at: string
  items: RfqCard[]
}

type DesignerPage = { sections: RfqSection[] }
type View = { mode: "list" } | { mode: "section" } | { mode: "show"; card: RfqCard } | { mode: "upsert"; card: RfqCard | null }
type SectionForm = { eyebrow: string; title: string; body: string; tone: string; status: string }
type CardForm = { itemKey: string; eyebrow: string; title: string; body: string; icon: string; tone: string; sortOrder: string; status: string }

export function RfqSectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const section = page?.sections.find((item) => item.section_key === "rfq-section")
  const cards = section?.items ?? []
  const term = search.trim().toLowerCase()
  const filtered = cards.filter((card) => {
    const matches = !term || [card.item_key, card.eyebrow, card.title, card.body].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matches && (status === "all" || card.status === status)
  })

  async function load() {
    setLoading(true)
    try {
      setPage(await adminApi<DesignerPage>("/frontend-designer/pages/home"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => onNotice("Unable to load the RFQ section."))
  }, [])

  async function saveSection(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<RfqSection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "rfq-section",
        sectionType: "rfq-flow",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 9,
        status: input.status,
        settings: { tone: input.tone },
      }),
    })
    await load()
    onNotice("RFQ section updated.")
    setView({ mode: "list" })
  }

  async function saveCard(input: CardForm, card: RfqCard | null) {
    if (!section?.uuid) return
    const saved = await adminApi<RfqCard>(
      card ? `/frontend-designer/items/${card.uuid}` : "/frontend-designer/items",
      {
        method: card ? "PUT" : "POST",
        body: JSON.stringify({
          sectionUuid: section.uuid,
          itemKey: input.itemKey,
          eyebrow: input.eyebrow,
          title: input.title,
          body: input.body,
          targetUrl: "#rfq",
          sortOrder: Number(input.sortOrder || 0),
          status: input.status,
          content: { icon: input.icon, tone: input.tone },
        }),
      },
    )
    await load()
    onNotice(card ? "RFQ step updated." : "RFQ step created.")
    setView({ mode: "show", card: saved })
  }

  if (view.mode === "section") return <SectionUpsert section={section} onBack={() => setView({ mode: "list" })} onSubmit={saveSection} />
  if (view.mode === "show") {
    const card = cards.find((item) => item.uuid === view.card.uuid) ?? view.card
    return <CardShow card={card} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", card })} />
  }
  if (view.mode === "upsert") return <CardUpsert card={view.card} onBack={() => setView(view.card ? { mode: "show", card: view.card } : { mode: "list" })} onSubmit={(input) => saveCard(input, view.card)} />

  return (
    <section className="slider-page rfq-section-page">
      <PageHeader
        title="RFQ Section"
        description="Manage the public RFQ and Business Leads section and its flow steps."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button" onClick={() => setView({ mode: "section" })} type="button"><Pencil size={16} />Edit header</button>
            <button className="admin-button primary" onClick={() => setView({ mode: "upsert", card: null })} type="button"><Plus size={16} />New card</button>
          </>
        )}
      />
      <RfqPreview section={section} cards={filtered} />
      <div className="slider-toolbar">
        <input onChange={(event) => setSearch(event.target.value)} placeholder="Search key, eyebrow, title, or body" value={search} />
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="slider-table-wrap">
        <table className="slider-table">
          <thead><tr><th>#</th><th>Card</th><th>Eyebrow</th><th>Status</th><th>Order</th><th>Updated</th><th className="align-right">Action</th></tr></thead>
          <tbody>
            {filtered.map((card, index) => (
              <tr key={card.uuid}>
                <td>{index + 1}</td>
                <td><button className="slider-title-link" onClick={() => setView({ mode: "show", card })} type="button">{card.title}</button><small>{card.item_key}</small></td>
                <td>{card.eyebrow || "-"}</td>
                <td><StatusBadge status={card.status} /></td>
                <td>{card.sort_order}</td>
                <td>{formatDate(card.updated_at)}</td>
                <td className="align-right">
                  <div className="slider-row-menu">
                    <button className="icon-action" onClick={() => setOpenAction((current) => current === card.uuid ? null : card.uuid)} title="Card actions" type="button"><MoreHorizontal size={16} /></button>
                    {openAction === card.uuid ? (
                      <div className="slider-row-menu-popover">
                        <button onClick={() => { setOpenAction(null); setView({ mode: "show", card }) }} type="button"><Eye size={15} />View</button>
                        <button onClick={() => { setOpenAction(null); setView({ mode: "upsert", card }) }} type="button"><Pencil size={15} />Edit</button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className="slider-empty">{loading ? "Loading RFQ steps." : "No RFQ steps found."}</div> : null}
      </div>
      <div className="slider-list-footer"><span>Total cards: <strong>{filtered.length}</strong></span><span>{cards.filter((item) => item.status === "active").length} active</span></div>
    </section>
  )
}

function RfqPreview({ cards, section }: { cards: RfqCard[]; section?: RfqSection }) {
  const form = sectionToForm(section)
  return (
    <div className={`rfq-preview tone-${form.tone}`}>
      <div>
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="rfq-preview-grid">
        {(cards.length ? cards : section?.items ?? []).slice(0, 6).map((card) => (
          <article key={card.uuid}>
            <small>{card.eyebrow} · {String(card.content?.icon ?? "send")} · {String(card.content?.tone ?? "blue")}</small>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function CardShow({ card, onBack, onEdit }: { card: RfqCard; onBack(): void; onEdit(): void }) {
  return (
    <section className="slider-page rfq-section-page">
      <PageHeader title={card.title} description={`${card.item_key} - Order ${card.sort_order} - ${card.status}`} back={onBack} actions={<button className="admin-button primary" onClick={onEdit} type="button"><Pencil size={16} />Edit card</button>} />
      <RfqPreview cards={[card]} />
      <div className="slider-detail-grid">
        <Detail label="Eyebrow" value={card.eyebrow} />
        <Detail label="Target" value={card.target_url} />
        <Detail label="Status" value={card.status} />
        <Detail label="Updated" value={formatDate(card.updated_at)} />
      </div>
    </section>
  )
}

function SectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: RfqSection }) {
  const [form, setForm] = useState<SectionForm>(() => sectionToForm(section))
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <section className="slider-page rfq-section-page">
      <PageHeader title="Edit RFQ section" description="Update public copy and tone for the RFQ flow area." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid three">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Tone" value={form.tone} options={["white", "soft", "blue", "green"]} onChange={(tone) => setForm({ ...form, tone })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <InputField label="Title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <TextareaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
        </div>
      </form>
    </section>
  )
}

function CardUpsert({ card, onBack, onSubmit }: { card: RfqCard | null; onBack(): void; onSubmit(input: CardForm): Promise<void> }) {
  const [form, setForm] = useState<CardForm>(() => cardToForm(card))
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <section className="slider-page rfq-section-page">
      <PageHeader title={card ? "Edit RFQ step" : "New RFQ step"} description="Manage one public RFQ flow step." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Card content</h3>
          <div className="slider-form-grid three">
            <InputField label="Card key" required value={form.itemKey} onChange={(itemKey) => setForm({ ...form, itemKey })} />
            <InputField label="Order" type="number" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
          <InputField label="Title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <div className="slider-form-grid two">
            <SelectField label="Icon" value={form.icon} options={["send", "scan-search", "file-text", "handshake"]} onChange={(icon) => setForm({ ...form, icon })} />
            <SelectField label="Tone" value={form.tone} options={["blue", "emerald", "orange", "violet"]} onChange={(tone) => setForm({ ...form, tone })} />
          </div>
          <TextareaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <RfqPreview cards={[formToCard(form, card)]} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save card</button>
        </div>
      </form>
    </section>
  )
}

function PageHeader({ actions, back, description, title }: { actions?: ReactNode; back?: () => void; description: string; title: string }) {
  return (
    <header className="slider-page-header">
      <div className="slider-page-heading">
        {back ? <button className="icon-action" onClick={back} title="Back" type="button"><ArrowLeft size={17} /></button> : null}
        <div><h2>{title}</h2><p>{description}</p></div>
      </div>
      {actions ? <div className="slider-page-actions">{actions}</div> : null}
    </header>
  )
}

function InputField({ label, onChange, required, type = "text", value }: { label: string; onChange(value: string): void; required?: boolean; type?: string; value: string }) {
  return <label>{label}<input onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>
}
function TextareaField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <label>{label}<textarea onChange={(event) => onChange(event.target.value)} rows={4} value={value} /></label>
}
function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: readonly string[]; value: string }) {
  return <label>{label}<select onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}
function StatusBadge({ status }: { status: string }) {
  return <span className={`slider-status status-${status}`}>{status}</span>
}
function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}
function sectionToForm(section?: RfqSection): SectionForm {
  return {
    eyebrow: section?.eyebrow ?? "RFQ and business leads",
    title: section?.title ?? "The revenue engine is buyer requirements and supplier response",
    body: section?.body ?? "Buyers post requirements. Suppliers receive matched leads, quote faster, and unlock contact access by plan.",
    tone: stringValue(section?.settings?.tone, "white"),
    status: section?.status ?? "active",
  }
}
function cardToForm(card: RfqCard | null): CardForm {
  return {
    itemKey: card?.item_key ?? `rfq-step-${Date.now()}`,
    eyebrow: card?.eyebrow ?? "",
    title: card?.title ?? "",
    body: card?.body ?? "",
    icon: stringValue(card?.content?.icon, "send"),
    tone: stringValue(card?.content?.tone, "blue"),
    sortOrder: String(card?.sort_order ?? 1),
    status: card?.status ?? "active",
  }
}
function formToCard(form: CardForm, card: RfqCard | null): RfqCard {
  return {
    uuid: card?.uuid ?? "preview",
    item_key: form.itemKey,
    eyebrow: form.eyebrow,
    title: form.title || "Module card title",
    summary: null,
    body: form.body,
    image_url: null,
    target_url: "#rfq",
    content: { icon: form.icon, tone: form.tone },
    sort_order: Number(form.sortOrder || 0),
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}
function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}
