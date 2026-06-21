import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type View =
  | { mode: "list" }
  | { mode: "show"; slider: SliderRecord }
  | { mode: "upsert"; slider: SliderRecord | null }

type SliderTone = "blue" | "emerald" | "orange" | "violet"

type SliderAction = {
  label: string
  target: string
  variant?: "primary" | "ghost"
}

type SliderInsight = {
  icon: string
  label: string
  tone: SliderTone
  value: string
}

type SliderLayer = {
  imagePosition?: string
  actions?: SliderAction[]
  card?: { eyebrow?: string; title?: string; body?: string }
  insights?: SliderInsight[]
}

type SliderRecord = {
  uuid: string
  item_key: string
  eyebrow: string | null
  title: string
  body: string | null
  image_url: string | null
  target_url: string | null
  content: SliderLayer
  sort_order: number
  status: string
  updated_at: string
}

type DesignerSection = {
  uuid: string
  section_key: string
  items: SliderRecord[]
}

type DesignerPage = {
  title: string
  sections: DesignerSection[]
}

type SliderForm = {
  itemKey: string
  sortOrder: string
  status: string
  eyebrow: string
  title: string
  body: string
  imageUrl: string
  imagePosition: string
  primaryLabel: string
  primaryTarget: string
  secondaryLabel: string
  secondaryTarget: string
  cardEyebrow: string
  cardTitle: string
  cardBody: string
  insights: SliderInsight[]
}

const insightTones: SliderTone[] = ["blue", "emerald", "orange", "violet"]

export function SliderDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const section = page?.sections.find((item) => item.section_key === "home-slider")
  const sliders = section?.items ?? []
  const term = search.trim().toLowerCase()
  const filtered = sliders.filter((slider) => {
    const matchesSearch = !term || [slider.item_key, slider.eyebrow, slider.title, slider.body].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matchesSearch && (status === "all" || slider.status === status)
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
    load().catch(() => onNotice("Unable to load slider designer."))
  }, [])

  useEffect(() => {
    if (view.mode === "list") return
    const current = sliders.find((slider) => slider.uuid === view.slider?.uuid)
    if (current) setView((active) => active.mode === "show" ? { mode: "show", slider: current } : active)
  }, [sliders])

  async function save(input: SliderForm, slider: SliderRecord | null) {
    if (!section?.uuid) return
    const payload = {
      sectionUuid: section.uuid,
      itemKey: input.itemKey,
      eyebrow: input.eyebrow,
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl,
      targetUrl: input.primaryTarget,
      sortOrder: Number(input.sortOrder || 0),
      status: input.status,
      content: {
        imagePosition: input.imagePosition,
        actions: [
          { label: input.primaryLabel, target: input.primaryTarget, variant: "primary" },
          ...(input.secondaryLabel ? [{ label: input.secondaryLabel, target: input.secondaryTarget, variant: "ghost" }] : []),
        ],
        card: { eyebrow: input.cardEyebrow, title: input.cardTitle, body: input.cardBody },
        insights: input.insights,
      },
    }
    const saved = await adminApi<SliderRecord>(
      slider ? `/frontend-designer/items/${slider.uuid}` : "/frontend-designer/items",
      { method: slider ? "PUT" : "POST", body: JSON.stringify(payload) },
    )
    await load()
    onNotice(slider ? "Slider updated." : "Slider created.")
    setView({ mode: "show", slider: { ...saved, content: normalizeLayer(saved.content) } })
  }

  if (view.mode === "show") {
    const slider = sliders.find((item) => item.uuid === view.slider.uuid) ?? view.slider
    return <SliderShowPage slider={slider} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", slider })} />
  }

  if (view.mode === "upsert") {
    return (
      <SliderUpsertPage
        slider={view.slider}
        onBack={() => setView(view.slider ? { mode: "show", slider: view.slider } : { mode: "list" })}
        onSubmit={(input) => save(input, view.slider)}
      />
    )
  }

  return (
    <section className="slider-page">
      <PageHeader
        title="Sliders"
        description="Manage public home slider content with list, preview, and focused editing."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setView({ mode: "upsert", slider: null })} type="button"><Plus size={16} />New slider</button>
          </>
        )}
      />

      <div className="slider-toolbar">
        <input onChange={(event) => setSearch(event.target.value)} placeholder="Search key, eyebrow, title, or content" value={search} />
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="slider-table-wrap">
        <table className="slider-table">
          <thead><tr><th>#</th><th>Slider</th><th>Eyebrow</th><th>Status</th><th>Image</th><th>Updated</th><th className="align-right">Action</th></tr></thead>
          <tbody>
            {filtered.map((slider, index) => (
              <tr key={slider.uuid}>
                <td>{index + 1}</td>
                <td><button className="slider-title-link" onClick={() => setView({ mode: "show", slider })} type="button">{slider.title}</button><small>{slider.item_key} · Order {slider.sort_order}</small></td>
                <td>{slider.eyebrow || "-"}</td>
                <td><StatusBadge status={slider.status} /></td>
                <td>{slider.image_url ? <img alt="" className="slider-list-thumb" src={slider.image_url} /> : "-"}</td>
                <td>{formatDate(slider.updated_at)}</td>
                <td className="align-right">
                  <div className="slider-row-menu">
                    <button className="icon-action" onClick={() => setOpenAction((current) => current === slider.uuid ? null : slider.uuid)} title="Slider actions" type="button"><MoreHorizontal size={16} /></button>
                    {openAction === slider.uuid ? (
                      <div className="slider-row-menu-popover">
                        <button onClick={() => { setOpenAction(null); setView({ mode: "show", slider }) }} type="button"><Eye size={15} />View</button>
                        <button onClick={() => { setOpenAction(null); setView({ mode: "upsert", slider }) }} type="button"><Pencil size={15} />Edit</button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className="slider-empty">{loading ? "Loading sliders." : "No sliders found."}</div> : null}
      </div>
      <div className="slider-list-footer"><span>Total sliders: <strong>{filtered.length}</strong></span><span>{sliders.filter((item) => item.status === "active").length} active</span></div>
    </section>
  )
}

function SliderShowPage({ onBack, onEdit, slider }: { onBack(): void; onEdit(): void; slider: SliderRecord }) {
  return (
    <section className="slider-page">
      <PageHeader
        title={slider.title}
        description={`${slider.item_key} · Order ${slider.sort_order} · ${slider.status}`}
        back={onBack}
        actions={<button className="admin-button primary" onClick={onEdit} type="button"><Pencil size={16} />Edit slider</button>}
      />
      <SliderPreview slider={slider} />
      <div className="slider-detail-grid">
        <Detail label="Eyebrow" value={slider.eyebrow} />
        <Detail label="Image position" value={normalizeLayer(slider.content).imagePosition} />
        <Detail label="Primary target" value={slider.target_url} />
        <Detail label="Updated" value={formatDate(slider.updated_at)} />
      </div>
    </section>
  )
}

function SliderUpsertPage({ onBack, onSubmit, slider }: { onBack(): void; onSubmit(input: SliderForm): Promise<void>; slider: SliderRecord | null }) {
  const [form, setForm] = useState<SliderForm>(() => toForm(slider))
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="slider-page">
      <PageHeader title={slider ? "Edit slider" : "New slider"} description="Edit slider content, trust card, actions, image, and insight tiles." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <SectionHeading title="Slider content" />
          <div className="slider-form-grid three">
            <InputField label="Slide key" required value={form.itemKey} onChange={(itemKey) => setForm({ ...form, itemKey })} />
            <InputField label="Order" type="number" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <div className="slider-form-grid two">
            <InputField label="Eyebrow" value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <InputField label="Title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          </div>
          <TextAreaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
          <div className="slider-form-grid two">
            <InputField label="Background image URL" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
            <InputField label="Image position" value={form.imagePosition} onChange={(imagePosition) => setForm({ ...form, imagePosition })} />
          </div>
        </div>

        <div className="slider-form-card">
          <SectionHeading title="Actions" />
          <div className="slider-form-grid two">
            <InputField label="Primary label" value={form.primaryLabel} onChange={(primaryLabel) => setForm({ ...form, primaryLabel })} />
            <InputField label="Primary target" value={form.primaryTarget} onChange={(primaryTarget) => setForm({ ...form, primaryTarget })} />
            <InputField label="Secondary label" value={form.secondaryLabel} onChange={(secondaryLabel) => setForm({ ...form, secondaryLabel })} />
            <InputField label="Secondary target" value={form.secondaryTarget} onChange={(secondaryTarget) => setForm({ ...form, secondaryTarget })} />
          </div>
        </div>

        <div className="slider-form-card">
          <SectionHeading title="Trust card" />
          <div className="slider-form-grid two">
            <InputField label="Card eyebrow" value={form.cardEyebrow} onChange={(cardEyebrow) => setForm({ ...form, cardEyebrow })} />
            <InputField label="Card title" value={form.cardTitle} onChange={(cardTitle) => setForm({ ...form, cardTitle })} />
          </div>
          <TextAreaField label="Card body" value={form.cardBody} onChange={(cardBody) => setForm({ ...form, cardBody })} />
        </div>

        <div className="slider-form-card">
          <SectionHeading title="Insight tiles" />
          <div className="slider-insight-editor">
            {form.insights.map((insight, index) => (
              <div className={`slider-insight-form tone-${insight.tone}`} key={index}>
                <InputField label="Icon" value={insight.icon} onChange={(icon) => setInsight(setForm, form, index, { icon })} />
                <InputField label="Value" value={insight.value} onChange={(value) => setInsight(setForm, form, index, { value })} />
                <InputField label="Label" value={insight.label} onChange={(label) => setInsight(setForm, form, index, { label })} />
                <SelectField label="Colour" value={insight.tone} options={insightTones} onChange={(tone) => setInsight(setForm, form, index, { tone: tone as SliderTone })} />
              </div>
            ))}
          </div>
        </div>

        <div className="slider-form-card">
          <SectionHeading title="Preview" />
          <SliderPreview slider={fromForm(form, slider?.uuid ?? "preview")} compact />
        </div>

        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save slider</button>
        </div>
      </form>
    </section>
  )
}

function SliderPreview({ compact = false, slider }: { compact?: boolean; slider: SliderRecord }) {
  const layer = normalizeLayer(slider.content)
  return (
    <div className={`slider-preview ${compact ? "compact" : ""}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.84), rgba(2,6,23,.48), rgba(2,6,23,.16)), url(${slider.image_url ?? ""})`, backgroundPosition: layer.imagePosition ?? "center" }}>
      <div className="slider-preview-content">
        <small>{slider.eyebrow}</small>
        <h2>{slider.title}</h2>
        <p>{slider.body}</p>
        <div>{layer.actions?.map((action) => <span className={action.variant === "ghost" ? "ghost" : ""} key={`${action.label}-${action.target}`}>{action.label}</span>)}</div>
      </div>
      <div className="slider-preview-layer">
        <article><small>{layer.card?.eyebrow}</small><strong>{layer.card?.title}</strong><p>{layer.card?.body}</p></article>
        <div className="slider-preview-insights">{layer.insights?.map((insight) => <span className={`tone-${insight.tone}`} key={`${insight.icon}-${insight.label}`}><b>{insight.icon}</b><strong>{insight.value}</strong><small>{insight.label}</small></span>)}</div>
      </div>
    </div>
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

function TextAreaField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <label>{label}<textarea onChange={(event) => onChange(event.target.value)} rows={4} value={value} /></label>
}

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: readonly string[]; value: string }) {
  return <label>{label}<select onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
}

function SectionHeading({ title }: { title: string }) {
  return <h3 className="slider-form-heading">{title}</h3>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`slider-status status-${status}`}>{status}</span>
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}

function normalizeLayer(value: unknown): SliderLayer {
  if (!value) return {}
  if (typeof value === "string") {
    try { return JSON.parse(value) as SliderLayer } catch { return {} }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as SliderLayer : {}
}

function toForm(slider: SliderRecord | null): SliderForm {
  const layer = normalizeLayer(slider?.content)
  const actions = layer.actions ?? []
  const insights = [...(layer.insights ?? [])]
  while (insights.length < 4) insights.push({ icon: "", label: "", value: "", tone: insightTones[insights.length] })
  return {
    itemKey: slider?.item_key ?? `home-slider-${Date.now()}`,
    sortOrder: String(slider?.sort_order ?? 1),
    status: slider?.status ?? "active",
    eyebrow: slider?.eyebrow ?? "",
    title: slider?.title ?? "",
    body: slider?.body ?? "",
    imageUrl: slider?.image_url ?? "",
    imagePosition: layer.imagePosition ?? "center",
    primaryLabel: actions[0]?.label ?? "Explore directory",
    primaryTarget: actions[0]?.target ?? "directory",
    secondaryLabel: actions[1]?.label ?? "Post requirement",
    secondaryTarget: actions[1]?.target ?? "rfq",
    cardEyebrow: layer.card?.eyebrow ?? "",
    cardTitle: layer.card?.title ?? "",
    cardBody: layer.card?.body ?? "",
    insights: insights.slice(0, 4),
  }
}

function fromForm(form: SliderForm, uuid: string): SliderRecord {
  return {
    uuid,
    item_key: form.itemKey,
    eyebrow: form.eyebrow,
    title: form.title || "Slider title",
    body: form.body,
    image_url: form.imageUrl,
    target_url: form.primaryTarget,
    sort_order: Number(form.sortOrder || 0),
    status: form.status,
    updated_at: new Date().toISOString(),
    content: {
      imagePosition: form.imagePosition,
      actions: [
        { label: form.primaryLabel, target: form.primaryTarget, variant: "primary" },
        ...(form.secondaryLabel ? [{ label: form.secondaryLabel, target: form.secondaryTarget, variant: "ghost" as const }] : []),
      ],
      card: { eyebrow: form.cardEyebrow, title: form.cardTitle, body: form.cardBody },
      insights: form.insights,
    },
  }
}

function setInsight(setForm: Dispatch<SetStateAction<SliderForm>>, form: SliderForm, index: number, patch: Partial<SliderInsight>) {
  const insights = [...form.insights]
  insights[index] = { ...insights[index], ...patch }
  setForm({ ...form, insights })
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}
