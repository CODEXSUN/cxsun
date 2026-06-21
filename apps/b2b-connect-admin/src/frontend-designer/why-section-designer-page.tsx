import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type StoryTone = "blue" | "emerald" | "orange" | "violet"

type WhyRecord = {
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

type WhySection = {
  uuid: string
  section_key: string
  eyebrow: string | null
  title: string | null
  body: string | null
  settings: Record<string, unknown>
  status: string
  items: WhyRecord[]
}

type DesignerPage = {
  sections: WhySection[]
}

type View =
  | { mode: "list" }
  | { mode: "show"; story: WhyRecord }
  | { mode: "upsert"; story: WhyRecord | null }
  | { mode: "section" }

type StoryForm = {
  itemKey: string
  badge: string
  label: string
  title: string
  body: string
  imageUrl: string
  tone: StoryTone
  sortOrder: string
  status: string
}

type SectionForm = {
  eyebrow: string
  title: string
  body: string
  label: string
  headline: string
  imageUrl: string
  status: string
}

const tones: StoryTone[] = ["blue", "emerald", "orange", "violet"]

export function WhySectionDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const section = page?.sections.find((item) => item.section_key === "why-section")
  const stories = section?.items ?? []
  const term = search.trim().toLowerCase()
  const filtered = stories.filter((story) => {
    const matches = !term || [story.item_key, story.eyebrow, story.summary, story.title, story.body].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matches && (status === "all" || story.status === status)
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
    load().catch(() => onNotice("Unable to load the Why section."))
  }, [])

  async function saveSection(input: SectionForm) {
    if (!section?.uuid) return
    await adminApi<WhySection>(`/frontend-designer/sections/${section.uuid}`, {
      method: "PUT",
      body: JSON.stringify({
        pageKey: "home",
        sectionKey: "why-section",
        sectionType: "image-story",
        eyebrow: input.eyebrow,
        title: input.title,
        body: input.body,
        status: input.status,
        sortOrder: 3,
        settings: { label: input.label, headline: input.headline, image: input.imageUrl, tone: "white" },
      }),
    })
    await load()
    onNotice("Why section header updated.")
    setView({ mode: "list" })
  }

  async function saveStory(input: StoryForm, story: WhyRecord | null) {
    if (!section?.uuid) return
    const payload = {
      sectionUuid: section.uuid,
      itemKey: input.itemKey,
      eyebrow: input.badge,
      title: input.title,
      summary: input.label,
      body: input.body,
      imageUrl: input.imageUrl,
      targetUrl: "#why",
      sortOrder: Number(input.sortOrder || 0),
      status: input.status,
      content: { tone: input.tone, label: input.label, badge: input.badge },
    }
    const saved = await adminApi<WhyRecord>(
      story ? `/frontend-designer/items/${story.uuid}` : "/frontend-designer/items",
      { method: story ? "PUT" : "POST", body: JSON.stringify(payload) },
    )
    await load()
    onNotice(story ? "Why story updated." : "Why story created.")
    setView({ mode: "show", story: saved })
  }

  if (view.mode === "section") {
    return <SectionUpsert section={section} onBack={() => setView({ mode: "list" })} onSubmit={saveSection} />
  }

  if (view.mode === "show") {
    const story = stories.find((item) => item.uuid === view.story.uuid) ?? view.story
    return <StoryShow section={section} story={story} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", story })} />
  }

  if (view.mode === "upsert") {
    return <StoryUpsert story={view.story} onBack={() => setView(view.story ? { mode: "show", story: view.story } : { mode: "list" })} onSubmit={(input) => saveStory(input, view.story)} />
  }

  return (
    <section className="slider-page why-section-page">
      <PageHeader
        title="Why Section"
        description="Manage the public Why Tirupur Connect section, story tabs, images, and badge copy."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button" onClick={() => setView({ mode: "section" })} type="button"><Pencil size={16} />Edit header</button>
            <button className="admin-button primary" onClick={() => setView({ mode: "upsert", story: null })} type="button"><Plus size={16} />New story</button>
          </>
        )}
      />

      <SectionSummary section={section} />

      <div className="slider-toolbar">
        <input onChange={(event) => setSearch(event.target.value)} placeholder="Search story, badge, title, or body" value={search} />
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="slider-table-wrap">
        <table className="slider-table">
          <thead><tr><th>#</th><th>Story</th><th>Badge</th><th>Tone</th><th>Status</th><th>Image</th><th>Updated</th><th className="align-right">Action</th></tr></thead>
          <tbody>
            {filtered.map((story, index) => (
              <tr key={story.uuid}>
                <td>{index + 1}</td>
                <td><button className="slider-title-link" onClick={() => setView({ mode: "show", story })} type="button">{story.title}</button><small>{story.item_key} - Order {story.sort_order}</small></td>
                <td>{story.eyebrow || story.summary || "-"}</td>
                <td><span className={`why-tone-pill tone-${storyTone(story)}`}>{storyTone(story)}</span></td>
                <td><StatusBadge status={story.status} /></td>
                <td>{story.image_url ? <img alt="" className="slider-list-thumb" src={story.image_url} /> : "-"}</td>
                <td>{formatDate(story.updated_at)}</td>
                <td className="align-right">
                  <div className="slider-row-menu">
                    <button className="icon-action" onClick={() => setOpenAction((current) => current === story.uuid ? null : story.uuid)} title="Story actions" type="button"><MoreHorizontal size={16} /></button>
                    {openAction === story.uuid ? (
                      <div className="slider-row-menu-popover">
                        <button onClick={() => { setOpenAction(null); setView({ mode: "show", story }) }} type="button"><Eye size={15} />View</button>
                        <button onClick={() => { setOpenAction(null); setView({ mode: "upsert", story }) }} type="button"><Pencil size={15} />Edit</button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className="slider-empty">{loading ? "Loading Why stories." : "No Why stories found."}</div> : null}
      </div>
      <div className="slider-list-footer"><span>Total stories: <strong>{filtered.length}</strong></span><span>{stories.filter((item) => item.status === "active").length} active</span></div>
    </section>
  )
}

function SectionSummary({ section }: { section?: WhySection }) {
  const settings = sectionSettings(section)
  return (
    <div className="why-section-summary">
      <figure>{settings.image ? <img alt="" src={settings.image} /> : null}</figure>
      <div>
        <small>{section?.eyebrow || "Why Tirupur Connect"}</small>
        <h3>{section?.title || "Tirupur is strong, but business discovery is still fragmented"}</h3>
        <p>{section?.body || "One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions."}</p>
        <strong>{settings.label}</strong>
        <span>{settings.headline}</span>
      </div>
    </div>
  )
}

function StoryShow({ onBack, onEdit, section, story }: { onBack(): void; onEdit(): void; section?: WhySection; story: WhyRecord }) {
  const settings = sectionSettings(section)
  return (
    <section className="slider-page why-section-page">
      <PageHeader title={story.title} description={`${story.item_key} - Order ${story.sort_order} - ${story.status}`} back={onBack} actions={<button className="admin-button primary" onClick={onEdit} type="button"><Pencil size={16} />Edit story</button>} />
      <WhyPreview section={section} settings={settings} stories={[story]} />
      <div className="slider-detail-grid">
        <Detail label="Badge" value={story.eyebrow} />
        <Detail label="Tab label" value={story.summary} />
        <Detail label="Tone" value={storyTone(story)} />
        <Detail label="Image" value={story.image_url} />
      </div>
    </section>
  )
}

function SectionUpsert({ onBack, onSubmit, section }: { onBack(): void; onSubmit(input: SectionForm): Promise<void>; section?: WhySection }) {
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
    <section className="slider-page why-section-page">
      <PageHeader title="Edit Why section header" description="Control the section eyebrow, title, body, story heading, and default image." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Section content</h3>
          <div className="slider-form-grid two">
            <InputField label="Eyebrow" required value={form.eyebrow} onChange={(eyebrow) => setForm({ ...form, eyebrow })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <InputField label="Section title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <TextareaField label="Section body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
          <div className="slider-form-grid two">
            <InputField label="Story label" required value={form.label} onChange={(label) => setForm({ ...form, label })} />
            <InputField label="Default image URL" required value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          </div>
          <TextareaField label="Story headline" value={form.headline} onChange={(headline) => setForm({ ...form, headline })} />
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <WhyPreview section={formToSection(form, section)} settings={sectionSettings(formToSection(form, section))} stories={section?.items ?? []} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save section</button>
        </div>
      </form>
    </section>
  )
}

function StoryUpsert({ onBack, onSubmit, story }: { onBack(): void; onSubmit(input: StoryForm): Promise<void>; story: WhyRecord | null }) {
  const [form, setForm] = useState<StoryForm>(() => storyToForm(story))
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

  const previewStory = formToStory(form, story)

  return (
    <section className="slider-page why-section-page">
      <PageHeader title={story ? "Edit Why story" : "New Why story"} description="Control one badge tab with its title, explanation, image, tone, order, and visibility." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Story content</h3>
          <div className="slider-form-grid three">
            <InputField label="Story key" required value={form.itemKey} onChange={(itemKey) => setForm({ ...form, itemKey })} />
            <InputField label="Order" type="number" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <div className="slider-form-grid three why-story-grid">
            <InputField label="Badge" required value={form.badge} onChange={(badge) => setForm({ ...form, badge })} />
            <InputField label="Tab label" required value={form.label} onChange={(label) => setForm({ ...form, label })} />
            <SelectField label="Tone" value={form.tone} options={tones} onChange={(tone) => setForm({ ...form, tone: normalizeTone(tone) })} />
          </div>
          <InputField label="Title" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <TextareaField label="Body" value={form.body} onChange={(body) => setForm({ ...form, body })} />
          <InputField label="Image URL" required value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <WhyPreview stories={[previewStory]} />
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save story</button>
        </div>
      </form>
    </section>
  )
}

function WhyPreview({ section, settings, stories }: { section?: WhySection; settings?: ReturnType<typeof sectionSettings>; stories: WhyRecord[] }) {
  const config = settings ?? sectionSettings(section)
  const story = stories[0]
  return (
    <div className="why-preview">
      <figure>{(story?.image_url || config.image) ? <img alt="" src={story?.image_url || config.image} /> : null}</figure>
      <div>
        <small>{story?.summary || config.label}</small>
        <h3>{story?.title || config.headline}</h3>
        {story ? <p>{story.body}</p> : <p>{section?.body}</p>}
        <div className="why-preview-chips">
          {(stories.length ? stories : section?.items ?? []).slice(0, 5).map((item) => (
            <span className={`why-tone-pill tone-${storyTone(item)}`} key={item.uuid}>{item.eyebrow || item.summary}</span>
          ))}
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

function StatusBadge({ status }: { status: string }) {
  return <span className={`slider-status status-${status}`}>{status}</span>
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}

function sectionSettings(section?: WhySection) {
  return {
    label: stringValue(section?.settings?.label, "Knitted fabric rolls to finished business"),
    headline: stringValue(section?.settings?.headline, "From Tirupur knitted fabric rolls to verified export-ready supplier profiles."),
    image: stringValue(section?.settings?.image, "https://images.unsplash.com/photo-1771098206672-8996549a59f2?auto=format&fit=crop&fm=jpg&q=84&w=1800"),
  }
}

function sectionToForm(section?: WhySection): SectionForm {
  const settings = sectionSettings(section)
  return {
    eyebrow: section?.eyebrow ?? "Why Tirupur Connect",
    title: section?.title ?? "Tirupur is strong, but business discovery is still fragmented",
    body: section?.body ?? "One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions.",
    label: settings.label,
    headline: settings.headline,
    imageUrl: settings.image,
    status: section?.status ?? "active",
  }
}

function formToSection(form: SectionForm, section?: WhySection): WhySection {
  return {
    uuid: section?.uuid ?? "preview",
    section_key: "why-section",
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    settings: { label: form.label, headline: form.headline, image: form.imageUrl },
    status: form.status,
    items: section?.items ?? [],
  }
}

function storyToForm(story: WhyRecord | null): StoryForm {
  return {
    itemKey: story?.item_key ?? `why-story-${Date.now()}`,
    badge: story?.eyebrow ?? "",
    label: story?.summary ?? story?.eyebrow ?? "",
    title: story?.title ?? "",
    body: story?.body ?? "",
    imageUrl: story?.image_url ?? "",
    tone: story ? storyTone(story) : "blue",
    sortOrder: String(story?.sort_order ?? 1),
    status: story?.status ?? "active",
  }
}

function formToStory(form: StoryForm, story: WhyRecord | null): WhyRecord {
  return {
    uuid: story?.uuid ?? "preview",
    item_key: form.itemKey,
    eyebrow: form.badge,
    title: form.title || "Why story title",
    summary: form.label,
    body: form.body,
    image_url: form.imageUrl,
    target_url: "#why",
    content: { tone: form.tone, label: form.label, badge: form.badge },
    sort_order: Number(form.sortOrder || 0),
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}

function storyTone(story: WhyRecord): StoryTone {
  return normalizeTone(stringValue(story.content?.tone))
}

function normalizeTone(value: string): StoryTone {
  return tones.includes(value as StoryTone) ? value as StoryTone : "blue"
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}
