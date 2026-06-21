import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, BadgeCheck, Pencil, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type ProfileSection = {
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

type DesignerPage = { sections: ProfileSection[] }

type SectionForm = {
  eyebrow: string
  title: string
  body: string
  tone: string
  helperTitle: string
  helperBody: string
  status: string
}

export function ProfileSectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const section = page?.sections.find((item) => item.section_key === "profile-section")

  async function load() {
    setLoading(true)
    try {
      setPage(await adminApi<DesignerPage>("/frontend-designer/pages/home"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => onNotice("Unable to load the Profile section."))
  }, [])

  async function save(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<ProfileSection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "profile-section",
        sectionType: "live-profile-showcase",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        sortOrder: 5,
        status: input.status,
        settings: { tone: input.tone, helperTitle: input.helperTitle, helperBody: input.helperBody },
      }),
    })
    await load()
    setEditing(false)
    onNotice("Profile section updated.")
  }

  if (editing) return <ProfileSectionUpsert section={section} onBack={() => setEditing(false)} onSubmit={save} />

  return (
    <section className="slider-page profile-section-page">
      <PageHeader
        title="Profile Section"
        description="Manage the public company profile section copy. Profile carousel and product cards remain live marketplace data."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setEditing(true)} type="button"><Pencil size={16} />Edit section</button>
          </>
        )}
      />
      <ProfilePreview section={section} />
      <div className="slider-detail-grid">
        <Detail label="Section key" value={section?.section_key} />
        <Detail label="Type" value={section?.section_type} />
        <Detail label="Tone" value={stringValue(section?.settings?.tone, "white")} />
        <Detail label="Status" value={section?.status} />
      </div>
    </section>
  )
}

function ProfileSectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: ProfileSection }) {
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
    <section className="slider-page profile-section-page">
      <PageHeader title="Edit Profile section" description="Update public copy and tone for the live supplier profile area." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid three">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Tone" value={form.tone} options={["white", "soft"]} onChange={(tone) => setForm({ ...form, tone })} />
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
          <ProfilePreview section={formToSection(form, section)} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
        </div>
      </form>
    </section>
  )
}

function ProfilePreview({ section }: { section?: ProfileSection }) {
  const form = sectionToForm(section)
  return (
    <div className={`directory-preview profile-preview tone-${form.tone}`}>
      <div className="directory-preview-copy">
        <small>{form.eyebrow}</small>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
      </div>
      <div className="directory-preview-live">
        <span><BadgeCheck size={20} /></span>
        <strong>{form.helperTitle}</strong>
        <p>{form.helperBody}</p>
        <div>
          <b>GST</b>
          <b>Factory</b>
          <b>Products</b>
          <b>WhatsApp</b>
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

function sectionToForm(section?: ProfileSection): SectionForm {
  return {
    eyebrow: section?.eyebrow ?? "Public company profile",
    title: section?.title ?? "Every supplier profile should tell buyers what matters before the first call",
    body: section?.body ?? "Each profile shows trust, capacity, products, certificates, photos, maps, contact actions, and quote flow.",
    tone: stringValue(section?.settings?.tone, "white"),
    helperTitle: stringValue(section?.settings?.helperTitle, "Live profile showcase"),
    helperBody: stringValue(section?.settings?.helperBody, "The rotating company profile and product cards stay connected to marketplace data. Use this designer screen for the public section copy and tone only."),
    status: section?.status ?? "active",
  }
}

function formToSection(form: SectionForm, section?: ProfileSection): ProfileSection {
  return {
    uuid: section?.uuid ?? "preview",
    section_key: "profile-section",
    section_type: "live-profile-showcase",
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    settings: { tone: form.tone, helperTitle: form.helperTitle, helperBody: form.helperBody },
    sort_order: 5,
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}
