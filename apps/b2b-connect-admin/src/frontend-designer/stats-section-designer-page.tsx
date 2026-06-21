import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, BarChart3, Pencil, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type StatsSection = {
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
}

type DesignerPage = { sections: StatsSection[] }

type SectionForm = {
  eyebrow: string
  title: string
  body: string
  tone: string
  helperTitle: string
  helperBody: string
  status: string
}

export function StatsSectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const section = page?.sections.find((item) => item.section_key === "stats-section")

  async function load() {
    setLoading(true)
    try {
      setPage(await adminApi<DesignerPage>("/frontend-designer/pages/home"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => onNotice("Unable to load the Stats section."))
  }, [])

  async function save(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<StatsSection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "stats-section",
        sectionType: "animated-stats",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 6,
        status: input.status,
        settings: { tone: input.tone, helperTitle: input.helperTitle, helperBody: input.helperBody },
      }),
    })
    await load()
    setEditing(false)
    onNotice("Stats section updated.")
  }

  if (editing) return <StatsSectionUpsert section={section} onBack={() => setEditing(false)} onSubmit={save} />

  return (
    <section className="slider-page stats-section-page">
      <PageHeader
        title="Stats Section"
        description="Manage the public Network Momentum section copy. Metric tiles remain animated public content."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setEditing(true)} type="button"><Pencil size={16} />Edit section</button>
          </>
        )}
      />
      <StatsPreview section={section} />
      <div className="slider-detail-grid">
        <Detail label="Section key" value={section?.section_key} />
        <Detail label="Type" value={section?.section_type} />
        <Detail label="Tone" value={stringValue(section?.settings?.tone, "blue")} />
        <Detail label="Status" value={section?.status} />
      </div>
    </section>
  )
}

function StatsSectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: StatsSection }) {
  const [form, setForm] = useState<SectionForm>(() => sectionToForm(section))
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
    <section className="slider-page stats-section-page">
      <PageHeader title="Edit Stats section" description="Update public copy and tone for the network momentum area." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid three">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Tone" value={form.tone} options={["blue", "white", "soft", "green"]} onChange={(tone) => setForm({ ...form, tone })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <InputField label="Title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <TextareaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
          <div className="slider-form-grid two">
            <InputField label="Admin helper title" value={form.helperTitle} onChange={(helperTitle) => setForm({ ...form, helperTitle })} />
            <TextareaField label="Admin helper body" value={form.helperBody} onChange={(helperBody) => setForm({ ...form, helperBody })} />
          </div>
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <StatsPreview section={formToSection(form, section)} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
        </div>
      </form>
    </section>
  )
}

function StatsPreview({ section }: { section?: StatsSection }) {
  const form = sectionToForm(section)
  return (
    <div className={`directory-preview stats-preview tone-${form.tone}`}>
      <div className="directory-preview-copy">
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="directory-preview-live">
        <span><BarChart3 size={20} /></span>
        <strong>{form.helperTitle}</strong>
        <p>{form.helperBody}</p>
        <div>
          <b>2,500+</b>
          <b>780+</b>
          <b>4,200+</b>
          <b>24</b>
        </div>
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

function TextareaField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <label>{label}<textarea onChange={(event) => onChange(event.target.value)} rows={4} value={value} /></label>
}

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: readonly string[]; value: string }) {
  return <label>{label}<select onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}

function sectionToForm(section?: StatsSection): SectionForm {
  return {
    eyebrow: section?.eyebrow ?? "Network momentum",
    title: section?.title ?? "A growing business network measured by useful outcomes",
    body: section?.body ?? "Members, verified factories, buyer requirements, connected orders, and market reach show whether the platform is creating real business value.",
    tone: stringValue(section?.settings?.tone, "blue"),
    helperTitle: stringValue(section?.settings?.helperTitle, "Animated marketplace metrics"),
    helperBody: stringValue(section?.settings?.helperBody, "The number cards remain animated public indicators. Use this designer screen to control the section headline, support copy, tone, and visibility."),
    status: section?.status ?? "active",
  }
}

function formToSection(form: SectionForm, section?: StatsSection): StatsSection {
  return {
    uuid: section?.uuid ?? "preview",
    section_key: "stats-section",
    section_type: "animated-stats",
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    settings: { tone: form.tone, helperTitle: form.helperTitle, helperBody: form.helperBody },
    sort_order: 6,
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}
