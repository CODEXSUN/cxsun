import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Eye, Image, MoreHorizontal, Pencil, Plus, RefreshCw, Save } from "lucide-react"
import { adminApi } from "../api"

type BrandRecord = {
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

type DesignerSection = {
  uuid: string
  section_key: string
  items: BrandRecord[]
}

type DesignerPage = {
  sections: DesignerSection[]
}

type View =
  | { mode: "list" }
  | { mode: "show"; brand: BrandRecord }
  | { mode: "upsert"; brand: BrandRecord | null }

type BrandForm = {
  itemKey: string
  mark: string
  title: string
  category: string
  logoUrl: string
  targetUrl: string
  sortOrder: string
  status: string
}

export function PlatformStripDesignerPage({ onNotice }: { onNotice(message: string): void }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [page, setPage] = useState<DesignerPage | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const section = page?.sections.find((item) => item.section_key === "platform-strip")
  const brands = section?.items ?? []
  const term = search.trim().toLowerCase()
  const filtered = brands.filter((brand) => {
    const matches = !term || [brand.item_key, brand.eyebrow, brand.title, brand.summary].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matches && (status === "all" || brand.status === status)
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
    load().catch(() => onNotice("Unable to load the platform strip."))
  }, [])

  async function save(input: BrandForm, brand: BrandRecord | null) {
    if (!section?.uuid) return
    const payload = {
      sectionUuid: section.uuid,
      itemKey: input.itemKey,
      eyebrow: input.mark,
      title: input.title,
      summary: input.category,
      imageUrl: input.logoUrl,
      targetUrl: input.targetUrl,
      sortOrder: Number(input.sortOrder || 0),
      status: input.status,
      content: { mark: input.mark, category: input.category },
    }
    const saved = await adminApi<BrandRecord>(
      brand ? `/frontend-designer/items/${brand.uuid}` : "/frontend-designer/items",
      { method: brand ? "PUT" : "POST", body: JSON.stringify(payload) },
    )
    await load()
    onNotice(brand ? "Platform brand updated." : "Platform brand created.")
    setView({ mode: "show", brand: saved })
  }

  if (view.mode === "show") {
    const brand = brands.find((item) => item.uuid === view.brand.uuid) ?? view.brand
    return <BrandShow brand={brand} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", brand })} />
  }

  if (view.mode === "upsert") {
    return (
      <BrandUpsert
        brand={view.brand}
        onBack={() => setView(view.brand ? { mode: "show", brand: view.brand } : { mode: "list" })}
        onSubmit={(input) => save(input, view.brand)}
      />
    )
  }

  return (
    <section className="slider-page platform-strip-page">
      <PageHeader
        title="Platform Strip"
        description="Manage the brands, associations, and ecosystem logos shown below the home slider."
        actions={(
          <>
            <button className="admin-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            <button className="admin-button primary" onClick={() => setView({ mode: "upsert", brand: null })} type="button"><Plus size={16} />New brand</button>
          </>
        )}
      />

      <div className="slider-toolbar">
        <input onChange={(event) => setSearch(event.target.value)} placeholder="Search brand, mark, category, or key" value={search} />
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="slider-table-wrap">
        <table className="slider-table platform-strip-table">
          <thead><tr><th>#</th><th>Logo</th><th>Brand</th><th>Category</th><th>Status</th><th>Order</th><th>Updated</th><th className="align-right">Action</th></tr></thead>
          <tbody>
            {filtered.map((brand, index) => (
              <tr key={brand.uuid}>
                <td>{index + 1}</td>
                <td><BrandMark brand={brand} /></td>
                <td><button className="slider-title-link" onClick={() => setView({ mode: "show", brand })} type="button">{brand.title}</button><small>{brand.item_key}</small></td>
                <td>{brand.summary || "-"}</td>
                <td><StatusBadge status={brand.status} /></td>
                <td>{brand.sort_order}</td>
                <td>{formatDate(brand.updated_at)}</td>
                <td className="align-right">
                  <div className="slider-row-menu">
                    <button className="icon-action" onClick={() => setOpenAction((current) => current === brand.uuid ? null : brand.uuid)} title="Brand actions" type="button"><MoreHorizontal size={16} /></button>
                    {openAction === brand.uuid ? (
                      <div className="slider-row-menu-popover">
                        <button onClick={() => { setOpenAction(null); setView({ mode: "show", brand }) }} type="button"><Eye size={15} />View</button>
                        <button onClick={() => { setOpenAction(null); setView({ mode: "upsert", brand }) }} type="button"><Pencil size={15} />Edit</button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className="slider-empty">{loading ? "Loading platform brands." : "No platform brands found."}</div> : null}
      </div>
      <div className="slider-list-footer"><span>Total brands: <strong>{filtered.length}</strong></span><span>{brands.filter((item) => item.status === "active").length} active</span></div>
    </section>
  )
}

function BrandShow({ brand, onBack, onEdit }: { brand: BrandRecord; onBack(): void; onEdit(): void }) {
  return (
    <section className="slider-page platform-strip-page">
      <PageHeader
        title={brand.title}
        description={`${brand.item_key} - Order ${brand.sort_order} - ${brand.status}`}
        back={onBack}
        actions={<button className="admin-button primary" onClick={onEdit} type="button"><Pencil size={16} />Edit brand</button>}
      />
      <div className="platform-strip-preview">
        <BrandCard brand={brand} />
        <BrandCard brand={brand} />
        <BrandCard brand={brand} />
      </div>
      <div className="slider-detail-grid">
        <Detail label="Short mark" value={brand.eyebrow} />
        <Detail label="Category" value={brand.summary} />
        <Detail label="Target" value={brand.target_url} />
        <Detail label="Logo URL" value={brand.image_url} />
      </div>
    </section>
  )
}

function BrandUpsert({ brand, onBack, onSubmit }: { brand: BrandRecord | null; onBack(): void; onSubmit(input: BrandForm): Promise<void> }) {
  const [form, setForm] = useState<BrandForm>(() => toForm(brand))
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
    <section className="slider-page platform-strip-page">
      <PageHeader title={brand ? "Edit platform brand" : "New platform brand"} description="Control the public strip label, logo, category, link, order, and visibility." back={onBack} />
      <form className="slider-upsert" onSubmit={submit}>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Brand content</h3>
          <div className="slider-form-grid three">
            <InputField label="Item key" required value={form.itemKey} onChange={(itemKey) => setForm({ ...form, itemKey })} />
            <InputField label="Order" type="number" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
            <SelectField label="Status" value={form.status} options={["active", "draft", "archived"]} onChange={(status) => setForm({ ...form, status })} />
          </div>
          <div className="slider-form-grid three platform-brand-fields">
            <InputField label="Short mark" required value={form.mark} onChange={(mark) => setForm({ ...form, mark })} />
            <InputField label="Brand name" required value={form.title} onChange={(title) => setForm({ ...form, title })} />
            <InputField label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} />
          </div>
          <div className="slider-form-grid two">
            <InputField label="Logo URL" value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
            <InputField label="Target URL or section" value={form.targetUrl} onChange={(targetUrl) => setForm({ ...form, targetUrl })} />
          </div>
        </div>
        <div className="slider-form-card">
          <h3 className="slider-form-heading">Preview</h3>
          <div className="platform-strip-preview single"><BrandCard brand={fromForm(form)} /></div>
        </div>
        <div className="slider-form-actions">
          <button className="admin-button" onClick={onBack} type="button"><ArrowLeft size={16} />Cancel</button>
          <button className="admin-button primary" disabled={saving} type="submit"><Save className={saving ? "spin" : ""} size={16} />Save brand</button>
        </div>
      </form>
    </section>
  )
}

function BrandCard({ brand }: { brand: BrandRecord }) {
  return <article className="platform-brand-card"><BrandMark brand={brand} /><span><strong>{brand.title}</strong><small>{brand.summary || "Ecosystem partner"}</small></span></article>
}

function BrandMark({ brand }: { brand: BrandRecord }) {
  return brand.image_url
    ? <span className="platform-brand-mark has-image"><img alt="" src={previewAssetUrl(brand.image_url)} /></span>
    : <span className="platform-brand-mark">{brand.eyebrow || <Image size={18} />}</span>
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

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: readonly string[]; value: string }) {
  return <label>{label}<select onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`slider-status status-${status}`}>{status}</span>
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return <article><small>{label}</small><strong>{String(value ?? "-")}</strong></article>
}

function toForm(brand: BrandRecord | null): BrandForm {
  return {
    itemKey: brand?.item_key ?? `platform-brand-${Date.now()}`,
    mark: brand?.eyebrow ?? "",
    title: brand?.title ?? "",
    category: brand?.summary ?? "",
    logoUrl: brand?.image_url ?? "",
    targetUrl: brand?.target_url ?? "#associations",
    sortOrder: String(brand?.sort_order ?? 1),
    status: brand?.status ?? "active",
  }
}

function fromForm(form: BrandForm): BrandRecord {
  return {
    uuid: "preview",
    item_key: form.itemKey,
    eyebrow: form.mark,
    title: form.title || "Brand name",
    summary: form.category,
    body: null,
    image_url: form.logoUrl,
    target_url: form.targetUrl,
    content: { mark: form.mark, category: form.category },
    sort_order: Number(form.sortOrder || 0),
    status: form.status,
    updated_at: new Date().toISOString(),
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function previewAssetUrl(value: string) {
  return value.startsWith("/") ? `http://localhost:6032${value}` : value
}
