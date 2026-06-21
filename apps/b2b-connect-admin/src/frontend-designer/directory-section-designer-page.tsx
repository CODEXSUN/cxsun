import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, FolderSearch, Pencil, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type DirectorySection = {
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

type DesignerPage = {
  sections: DirectorySection[]
}

type SectionForm = {
  eyebrow: string
  title: string
  body: string
  tone: string
  helperTitle: string
  helperBody: string
  status: string
}

export function DirectorySectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const section = page?.sections.find((item) => item.section_key === "directory-section")

  async function load() {
    setLoading(true)
    try {
      setPage(await adminApi<DesignerPage>("/frontend-designer/pages/home"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => onNotice("Unable to load the Directory section."))
  }, [])

  async function save(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<DirectorySection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "directory-section",
        sectionType: "live-directory",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 4,
        status: input.status,
        settings: { tone: input.tone, helperTitle: input.helperTitle, helperBody: input.helperBody },
      }),
    })
    await load()
    setEditing(false)
    onNotice("Directory section updated.")
  }

  if (editing) {
    return <DirectorySectionUpsert section={section} onBack={() => setEditing(false)} onSubmit={save} />
  }

  return (
    <section className="slider-page directory-section-page">
      <PageHeader
        title="Directory Section"
        description="Manage the public Business Directory section copy. Category and company cards remain live marketplace data."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setEditing(true)} type="button"><Pencil size={16} />Edit section</button>
          </>
        )}
      />
      <DirectoryPreview section={section} />
      <div className="slider-detail-grid">
        <Detail label="Section key" value={section?.section_key} />
        <Detail label="Type" value={section?.section_type} />
        <Detail label="Tone" value={stringValue(section?.settings?.tone, "soft")} />
        <Detail label="Status" value={section?.status} />
      </div>
    </section>
  )
}

function DirectorySectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: DirectorySection }) {
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
    <section className="slider-page directory-section-page">
      <PageHeader title="Edit Directory section" description="Update public copy and tone for the live directory area." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid three">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Tone" value={form.tone} options={["soft", "white"]} onChange={(tone) => setForm({ ...form, tone })} />
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
          <DirectoryPreview section={formToSection(form, section)} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
        </div>
      </form>
    </section>
  )
}

function DirectoryPreview({ section }: { section?: DirectorySection }) {
  const form = sectionToForm(section)
  return (
    <div className={`directory-preview tone-${form.tone}`}>
      <div className="directory-preview-copy">
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="directory-preview-live">
        <span><FolderSearch size={20} /></span>
        <strong>{form.helperTitle}</strong>
        <p>{form.helperBody}</p>
        <div>
          <b>Fabric</b>
          <b>Knitting</b>
          <b>Dyeing</b>
          <b>Exporters</b>
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

function sectionToForm(section?: DirectorySection): SectionForm {
  return {
    eyebrow: section?.eyebrow ?? "Business Directory",
    title: section?.title ?? "Searchable textile categories built for Tirupur's value chain",
    body: section?.body ?? "Find companies by real textile language: fabric, yarn, knitting, dyeing, printing, job work, exporters, accessories, logistics, and services.",
    tone: stringValue(section?.settings?.tone, "soft"),
    helperTitle: stringValue(section?.settings?.helperTitle, "Live marketplace directory"),
    helperBody: stringValue(section?.settings?.helperBody, "Category cards and company profiles below this header are live marketplace records. Use this designer screen only for the public section positioning and visitor-facing copy."),
    status: section?.status ?? "active",
  }
}

function formToSection(form: SectionForm, section?: DirectorySection): DirectorySection {
  return {
    uuid: section?.uuid ?? "preview",
    section_key: "directory-section",
    section_type: "live-directory",
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    settings: { tone: form.tone, helperTitle: form.helperTitle, helperBody: form.helperBody },
    sort_order: 4,
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}
