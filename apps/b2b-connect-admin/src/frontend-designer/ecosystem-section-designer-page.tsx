import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type EcosystemCard = {
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

type EcosystemSection = {
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
  items: EcosystemCard[]
}

type DesignerPage = { sections: EcosystemSection[] }
type View = { mode: "list" } | { mode: "section" } | { mode: "show"; card: EcosystemCard } | { mode: "upsert"; card: EcosystemCard | null }
type SectionForm = { eyebrow: string; title: string; body: string; tone: string; status: string }
type CardForm = { itemKey: string; eyebrow: string; title: string; body: string; sortOrder: string; status: string }

export function EcosystemSectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const section = page?.sections.find((item) => item.section_key === "ecosystem-section")
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
    load().catch(() => onNotice("Unable to load the Ecosystem section."))
  }, [])

  async function saveSection(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<EcosystemSection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "ecosystem-section",
        sectionType: "card-grid",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 7,
        status: input.status,
        settings: { tone: input.tone },
      }),
    })
    await load()
    onNotice("Ecosystem section updated.")
    setView({ mode: "list" })
  }

  async function saveCard(input: CardForm, card: EcosystemCard | null) {
    if (!section?.uuid) return
    const saved = await adminApi<EcosystemCard>(
      card ? `/frontend-designer/items/${card.uuid}` : "/frontend-designer/items",
      {
        method: card ? "PUT" : "POST",
        body: JSON.stringify({
          sectionUuid: section.uuid,
          itemKey: input.itemKey,
          eyebrow: input.eyebrow,
          title: input.title,
          body: input.body,
          targetUrl: "#marketplace",
          sortOrder: Number(input.sortOrder || 0),
          status: input.status,
          content: {},
        }),
      },
    )
    await load()
    onNotice(card ? "Ecosystem card updated." : "Ecosystem card created.")
    setView({ mode: "show", card: saved })
  }

  if (view.mode === "section") return <SectionUpsert section={section} onBack={() => setView({ mode: "list" })} onSubmit={saveSection} />
  if (view.mode === "show") {
    const card = cards.find((item) => item.uuid === view.card.uuid) ?? view.card
    return <CardShow card={card} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", card })} />
  }
  if (view.mode === "upsert") return <CardUpsert card={view.card} onBack={() => setView(view.card ? { mode: "show", card: view.card } : { mode: "list" })} onSubmit={(input) => saveCard(input, view.card)} />

  return (
    <section className="slider-page ecosystem-section-page">
      <PageHeader
        title="Ecosystem Section"
        description="Manage the public Core Ecosystem section and its module cards."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button" onClick={() => setView({ mode: "section" })} type="button"><Pencil size={16} />Edit header</button>
            <button className="admin-button primary" onClick={() => setView({ mode: "upsert", card: null })} type="button"><Plus size={16} />New card</button>
          </>
        )}
      />
      <EcosystemPreview section={section} cards={filtered} />
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
        {!filtered.length ? <div className="slider-empty">{loading ? "Loading ecosystem cards." : "No ecosystem cards found."}</div> : null}
      </div>
      <div className="slider-list-footer"><span>Total cards: <strong>{filtered.length}</strong></span><span>{cards.filter((item) => item.status === "active").length} active</span></div>
    </section>
  )
}

function EcosystemPreview({ cards, section }: { cards: EcosystemCard[]; section?: EcosystemSection }) {
  const form = sectionToForm(section)
  return (
    <div className={`ecosystem-preview tone-${form.tone}`}>
      <div>
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="ecosystem-preview-grid">
        {(cards.length ? cards : section?.items ?? []).slice(0, 6).map((card) => (
          <article key={card.uuid}>
            <small>{card.eyebrow}</small>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function CardShow({ card, onBack, onEdit }: { card: EcosystemCard; onBack(): void; onEdit(): void }) {
  return (
    <section className="slider-page ecosystem-section-page">
      <PageHeader title={card.title} description={`${card.item_key} - Order ${card.sort_order} - ${card.status}`} back={onBack} actions={<button className="admin-button primary" onClick={onEdit} type="button"><Pencil size={16} />Edit card</button>} />
      <EcosystemPreview cards={[card]} />
      <div className="slider-detail-grid">
        <Detail label="Eyebrow" value={card.eyebrow} />
        <Detail label="Target" value={card.target_url} />
        <Detail label="Status" value={card.status} />
        <Detail label="Updated" value={formatDate(card.updated_at)} />
      </div>
    </section>
  )
}

function SectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: EcosystemSection }) {
  const [form, setForm] = useState<SectionForm>(() => sectionToForm(section))
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <section className="slider-page ecosystem-section-page">
      <PageHeader title="Edit Ecosystem section" description="Update public copy and tone for the module card area." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid three">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Tone" value={form.tone} options={["green", "white", "soft", "blue"]} onChange={(tone) => setForm({ ...form, tone })} />
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

function CardUpsert({ card, onBack, onSubmit }: { card: EcosystemCard | null; onBack(): void; onSubmit(input: CardForm): Promise<void> }) {
  const [form, setForm] = useState<CardForm>(() => cardToForm(card))
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <section className="slider-page ecosystem-section-page">
      <PageHeader title={card ? "Edit ecosystem card" : "New ecosystem card"} description="Manage one public ecosystem module card." back={onBack} />
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
          <TextareaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <EcosystemPreview cards={[formToCard(form, card)]} />
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
function sectionToForm(section?: EcosystemSection): SectionForm {
  return {
    eyebrow: section?.eyebrow ?? "Core ecosystem modules",
    title: section?.title ?? "More than a directory: a textile operating network",
    body: section?.body ?? "Directory, profiles, verification, RFQs, capacity, networking, events, jobs, news, ads, analytics, and CRM-like follow-up.",
    tone: stringValue(section?.settings?.tone, "green"),
    status: section?.status ?? "active",
  }
}
function cardToForm(card: EcosystemCard | null): CardForm {
  return {
    itemKey: card?.item_key ?? `ecosystem-card-${Date.now()}`,
    eyebrow: card?.eyebrow ?? "",
    title: card?.title ?? "",
    body: card?.body ?? "",
    sortOrder: String(card?.sort_order ?? 1),
    status: card?.status ?? "active",
  }
}
function formToCard(form: CardForm, card: EcosystemCard | null): EcosystemCard {
  return {
    uuid: card?.uuid ?? "preview",
    item_key: form.itemKey,
    eyebrow: form.eyebrow,
    title: form.title || "Module card title",
    summary: null,
    body: form.body,
    image_url: null,
    target_url: "#marketplace",
    content: {},
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
