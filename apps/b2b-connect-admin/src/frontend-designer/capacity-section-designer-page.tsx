import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Pencil, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type CapacitySection = {
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
  items: unknown[]
}

type DesignerPage = { sections: CapacitySection[] }
type View = "show" | "upsert"
type SectionForm = {
  body: string
  eyebrow: string
  image: string
  items: string
  label: string
  reverse: boolean
  status: string
  storyTitle: string
  title: string
  tone: string
}

export function CapacitySectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>("show")
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [loading, setLoading] = useState(false)
  const section = page?.sections.find((item) => item.section_key === "capacity-section")

  async function load() {
    setLoading(true)
    try {
      setPage(await adminApi<DesignerPage>("/frontend-designer/pages/home"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => onNotice("Unable to load the capacity section."))
  }, [])

  async function saveSection(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<CapacitySection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "capacity-section",
        sectionType: "image-story",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 11,
        status: input.status,
        settings: {
          image: input.image,
          items: input.items.split(",").map((item) => item.trim()).filter(Boolean),
          label: input.label,
          reverse: input.reverse,
          storyTitle: input.storyTitle,
          tone: input.tone,
        },
      }),
    })
    await load()
    onNotice("Capacity section updated.")
    setView("show")
  }

  if (view === "upsert") return <SectionUpsert section={section} onBack={() => setView("show")} onSubmit={saveSection} />

  return (
    <section className="slider-page rfq-section-page">
      <PageHeader
        title="Capacity Section"
        description="Manage the public capacity exchange image-story section."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setView("upsert")} type="button"><Pencil size={16} />Edit section</button>
          </>
        )}
      />
      <CapacityPreview section={section} />
      <div className="slider-detail-grid">
        <Detail label="Section key" value={section?.section_key ?? "capacity-section"} />
        <Detail label="Type" value={section?.section_type ?? "image-story"} />
        <Detail label="Status" value={section?.status ?? "active"} />
        <Detail label="Updated" value={section?.updated_at ? formatDate(section.updated_at) : "-"} />
      </div>
    </section>
  )
}

function CapacityPreview({ section }: { section?: CapacitySection }) {
  const form = sectionToForm(section)
  const chips = form.items.split(",").map((item) => item.trim()).filter(Boolean)
  return (
    <div className={`rfq-preview tone-${form.tone}`}>
      <div>
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="capacity-preview-story">
        <img alt={form.label} src={form.image} />
        <article>
          <small>{form.label}</small>
          <strong>{form.storyTitle}</strong>
          <div className="capacity-preview-chips">
            {chips.map((chip) => <span key={chip}>{chip}</span>)}
          </div>
        </article>
      </div>
    </div>
  )
}

function SectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: CapacitySection }) {
  const [form, setForm] = useState<SectionForm>(() => sectionToForm(section))
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <section className="slider-page rfq-section-page">
      <PageHeader title="Edit capacity section" description="Update the public capacity exchange copy and image story." back={onBack} />
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
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Image story</h3>
          <InputField label="Image URL" required value={form.image} onChange={(image) => setForm({ ...form, image })} />
          <div className="slider-form-grid two">
            <InputField label="Story label" required value={form.label} onChange={(label) => setForm({ ...form, label })} />
            <label className="slider-check"><input checked={form.reverse} onChange={(event) => setForm({ ...form, reverse: event.target.checked })} type="checkbox" /> Reverse layout</label>
          </div>
          <InputField label="Story title" required value={form.storyTitle} onChange={(storyTitle) => setForm({ ...form, storyTitle })} />
          <TextareaField label="Chips, comma separated" value={form.items} onChange={(items) => setForm({ ...form, items })} />
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <CapacityPreview section={formToSection(form, section)} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
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
function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}
function sectionToForm(section?: CapacitySection): SectionForm {
  const settings = section?.settings ?? {}
  return {
    body: section?.body ?? "Factories can publish spare capacity, machine type, MOQ, lead time, and location.",
    eyebrow: section?.eyebrow ?? "Capacity exchange",
    image: stringValue(settings.image, "https://images.unsplash.com/photo-1742281693317-c711080e8a19?auto=format&fit=crop&fm=jpg&q=84&w=1800"),
    items: stringArrayValue(settings.items, ["Available machines", "Lead time", "MOQ", "Location"]).join(", "),
    label: stringValue(settings.label, "Factory utilization"),
    reverse: settings.reverse === true,
    status: section?.status ?? "active",
    storyTitle: stringValue(settings.storyTitle, "A live capacity board can help factories fill idle time and buyers find faster job-work slots."),
    title: section?.title ?? "Idle capacity becomes a searchable business asset",
    tone: stringValue(settings.tone, "blue"),
  }
}
function formToSection(form: SectionForm, section?: CapacitySection): CapacitySection {
  return {
    uuid: section?.uuid ?? "preview",
    section_key: "capacity-section",
    section_type: "image-story",
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    settings: {
      image: form.image,
      items: form.items.split(",").map((item) => item.trim()).filter(Boolean),
      label: form.label,
      reverse: form.reverse,
      storyTitle: form.storyTitle,
      tone: form.tone,
    },
    sort_order: 11,
    status: form.status,
    updated_at: new Date().toISOString(),
    items: [],
  }
}
function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}
function stringArrayValue(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return items.length ? items : fallback
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}
