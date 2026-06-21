import { lazy, StrictMode, Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import {
  BarChart3,
  BadgeCheck,
  BriefcaseBusiness as BriefcaseBusinessIcon,
  Building2,
  CalendarDays,
  FileCheck2,
  FileText,
  FolderSearch,
  IdCard,
  Gauge,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Network,
  Newspaper,
  PackageSearch,
  PanelTop,
  Rocket,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { DashboardShell, getCxDesignSystem, TirupurConnectGlobalLoader, TirupurConnectLogo, type DashboardShellNavGroup } from "@cxsun/ui"
import "@cxsun/ui/styles/dashboard-shell.css"
import { ADMIN_LOADING_EVENT, adminApi, getToken, platformLogin, setToken } from "./api"
import "./styles.css"

type Tab =
  | "dashboard"
  | "submissions"
  | "companies"
  | "rfqs"
  | "inquiries"
  | "verifications"
  | "plans"
  | "events"
  | "jobs"
  | "articles"
  | "blog-categories"
  | "blog-tags"
  | "ads"
  | "site-rollout"
  | "slider-designer"
  | "platform-strip-designer"
  | "why-section-designer"
  | "directory-section-designer"
  | "profile-section-designer"
  | "stats-section-designer"
  | "ecosystem-section-designer"
  | "marketplace-section-designer"
  | "rfq-section-designer"
  | "broadcast-section-designer"
  | "capacity-section-designer"
  | "networking-section-designer"
  | "audit"

type Row = Record<string, unknown>

const navGroups: Array<DashboardShellNavGroup<Tab> & { icon: LucideIcon }> = [
  {
    icon: LayoutDashboard,
    id: "overview",
    label: "Overview",
    standalone: true,
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    icon: LayoutDashboard,
    id: "marketplace",
    label: "Marketplace",
    items: [
      { id: "submissions", label: "Submissions", icon: Inbox },
      { id: "companies", label: "Companies", icon: Building2 },
      { id: "rfqs", label: "RFQs", icon: FileText },
      { id: "inquiries", label: "Inquiries", icon: Users },
    ],
  },
  {
    icon: ShieldCheck,
    id: "trust-revenue",
    label: "Trust & revenue",
    items: [
      { id: "verifications", label: "Verification", icon: ShieldCheck },
      { id: "plans", label: "Membership plans", icon: WalletCards },
    ],
  },
  {
    icon: Newspaper,
    id: "content",
    label: "Content",
    items: [
      { id: "events", label: "Events", icon: CalendarDays },
      { id: "jobs", label: "Jobs", icon: FileCheck2 },
      { id: "ads", label: "Advertisements", icon: Megaphone },
    ],
  },
  {
    icon: Newspaper,
    id: "blog",
    label: "Blog",
    items: [
      { id: "articles", label: "Blog Post", icon: Newspaper },
      { id: "blog-categories", label: "Categories", icon: FolderSearch },
      { id: "blog-tags", label: "Tags", icon: BadgeCheck },
    ],
  },
  {
    icon: LayoutTemplate,
    id: "frontend",
    label: "Frontend",
    items: [
      { id: "slider-designer", label: "Sliders", icon: LayoutTemplate },
      { id: "platform-strip-designer", label: "Platform Strip", icon: PanelTop },
      { id: "why-section-designer", label: "Why Section", icon: Sparkles },
      { id: "directory-section-designer", label: "Directory Section", icon: FolderSearch },
      { id: "profile-section-designer", label: "Profile Section", icon: IdCard },
      { id: "stats-section-designer", label: "Stats Section", icon: BarChart3 },
      { id: "ecosystem-section-designer", label: "Ecosystem Section", icon: Network },
      { id: "marketplace-section-designer", label: "Marketplace Section", icon: PackageSearch },
      { id: "rfq-section-designer", label: "RFQ Section", icon: FileText },
      { id: "broadcast-section-designer", label: "Broadcast Section", icon: Megaphone },
      { id: "capacity-section-designer", label: "Capacity Section", icon: Gauge },
      { id: "networking-section-designer", label: "Networking Section", icon: Network },
      { id: "site-rollout", label: "Releases", icon: Rocket },
    ],
  },
  {
    icon: Gauge,
    id: "system",
    label: "System",
    items: [
      { id: "audit", label: "Audit logs", icon: Gauge },
    ],
  },
]

const tabLabels = Object.fromEntries(navGroups.flatMap((group) => group.items.map((item) => [item.id, item.label]))) as Record<Tab, string>
const adminDesign = getCxDesignSystem("emerald")
const BillingBlogDesk = lazy(() => import("./blog/blog-desk").then((module) => ({ default: module.BillingBlogDesk })))
const BlogTaxonomyPage = lazy(() => import("./blog/blog-desk").then((module) => ({ default: module.BlogTaxonomyPage })))
const CompanyModerationPage = lazy(() => import("./marketplace/company-moderation-page").then((module) => ({ default: module.CompanyModerationPage })))
const RfqModerationPage = lazy(() => import("./marketplace/rfq-moderation-page").then((module) => ({ default: module.RfqModerationPage })))
const SliderDesignerPage = lazy(() => import("./frontend-designer/slider-designer-page").then((module) => ({ default: module.SliderDesignerPage })))
const PlatformStripDesignerPage = lazy(() => import("./frontend-designer/platform-strip-designer-page").then((module) => ({ default: module.PlatformStripDesignerPage })))
const WhySectionDesignerPage = lazy(() => import("./frontend-designer/why-section-designer-page").then((module) => ({ default: module.WhySectionDesignerPage })))
const DirectorySectionDesignerPage = lazy(() => import("./frontend-designer/directory-section-designer-page").then((module) => ({ default: module.DirectorySectionDesignerPage })))
const ProfileSectionDesignerPage = lazy(() => import("./frontend-designer/profile-section-designer-page").then((module) => ({ default: module.ProfileSectionDesignerPage })))
const StatsSectionDesignerPage = lazy(() => import("./frontend-designer/stats-section-designer-page").then((module) => ({ default: module.StatsSectionDesignerPage })))
const EcosystemSectionDesignerPage = lazy(() => import("./frontend-designer/ecosystem-section-designer-page").then((module) => ({ default: module.EcosystemSectionDesignerPage })))
const MarketplaceSectionDesignerPage = lazy(() => import("./frontend-designer/marketplace-section-designer-page").then((module) => ({ default: module.MarketplaceSectionDesignerPage })))
const RfqSectionDesignerPage = lazy(() => import("./frontend-designer/rfq-section-designer-page").then((module) => ({ default: module.RfqSectionDesignerPage })))
const BroadcastSectionDesignerPage = lazy(() => import("./frontend-designer/broadcast-section-designer-page").then((module) => ({ default: module.BroadcastSectionDesignerPage })))
const CapacitySectionDesignerPage = lazy(() => import("./frontend-designer/capacity-section-designer-page").then((module) => ({ default: module.CapacitySectionDesignerPage })))
const NetworkingSectionDesignerPage = lazy(() => import("./frontend-designer/networking-section-designer-page").then((module) => ({ default: module.NetworkingSectionDesignerPage })))

function AdminApp() {
  const [token, updateToken] = useState(() => getToken())
  const [tab, setTab] = useState<Tab>("dashboard")
  const [notice, setNotice] = useState("")
  if (!token) {
    return (
      <>
        <TirupurConnectGlobalLoader eventName={ADMIN_LOADING_EVENT} label="Opening Tirupur Connect back office" />
        <AdminLogin onLogin={(next) => { setToken(next); updateToken(next) }} />
      </>
    )
  }

  function logout() {
    setToken(null)
    updateToken(null)
  }

  return (
    <>
      <TirupurConnectGlobalLoader eventName={ADMIN_LOADING_EVENT} label="Loading marketplace operations" />
      <DashboardShell
      activeAppId="tirupur-connect-admin"
      activePage={tab}
      apps={[{ id: "tirupur-connect-admin", name: "Tirupur Connect Admin", shortName: "TC Admin", description: "Marketplace staff back office", icon: BriefcaseBusinessIcon }]}
      brand={{ logo: <TirupurConnectLogo className="admin-sidebar-logo" title="Tirupur Connect admin" variant="light" />, name: "Tirupur Connect", subtitle: "marketplace-admin" }}
      homeHref="http://localhost:6032"
      navGroups={navGroups}
      navStyle={adminDesign.navStyle}
      onHome={() => { window.location.href = "http://localhost:6032" }}
      onLogout={logout}
      onNavigate={setTab}
      title={tabLabels[tab]}
      tone={adminDesign.tone}
      user={{ displayName: "SUNDAR", email: "sundar@sundar.com", roleLabel: "Super-admin mode" }}
      version="1.0.124"
    >
      {!['companies', 'rfqs', "articles", "blog-categories", "blog-tags", "slider-designer", "platform-strip-designer", "why-section-designer", "directory-section-designer", "profile-section-designer", "stats-section-designer", "ecosystem-section-designer", "marketplace-section-designer", "rfq-section-designer", "broadcast-section-designer", "capacity-section-designer", "networking-section-designer"].includes(tab) ? <header className="admin-page-title">
        <div>
          <small>Marketplace back office</small>
          <h1>{tabLabels[tab]}</h1>
        </div>
        <a href="http://localhost:6032" target="_blank">Open marketplace</a>
      </header> : null}
      {notice ? <div className="admin-notice">{notice}</div> : null}
      {tab === "dashboard" ? <Dashboard /> : null}
      {tab === "submissions" ? <SubmissionQueue onNotice={setNotice} /> : null}
      {tab === "companies" ? (
        <Suspense fallback={<div className="admin-panel">Loading company moderation...</div>}>
          <CompanyModerationPage onNotice={setNotice} />
        </Suspense>
      ) : null}
      {tab === "rfqs" ? (
        <Suspense fallback={<div className="admin-panel">Loading RFQ moderation...</div>}>
          <RfqModerationPage onNotice={setNotice} />
        </Suspense>
      ) : null}
      {tab === "inquiries" ? <ModerationList entity="inquiries" onNotice={setNotice} /> : null}
      {tab === "verifications" ? <VerificationQueue onNotice={setNotice} /> : null}
      {tab === "plans" ? <Plans onNotice={setNotice} /> : null}
      {["events", "jobs", "ads"].includes(tab) ? <ContentManager onNotice={setNotice} type={contentType(tab)} /> : null}
      {tab === "articles" ? (
        <Suspense fallback={<div className="admin-panel">Loading Blog Desk...</div>}>
          <BillingBlogDesk onNotice={setNotice} />
        </Suspense>
      ) : null}
      {tab === "blog-categories" || tab === "blog-tags" ? (
        <Suspense fallback={<div className="admin-panel">Loading Blog taxonomy...</div>}>
          <BlogTaxonomyPage kind={tab === "blog-categories" ? "categories" : "tags"} onNotice={setNotice} />
        </Suspense>
      ) : null}
      <Suspense fallback={<div className="admin-panel">Loading frontend editor...</div>}>
        {tab === "slider-designer" ? <SliderDesignerPage onNotice={setNotice} /> : null}
        {tab === "platform-strip-designer" ? <PlatformStripDesignerPage onNotice={setNotice} /> : null}
        {tab === "why-section-designer" ? <WhySectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "directory-section-designer" ? <DirectorySectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "profile-section-designer" ? <ProfileSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "stats-section-designer" ? <StatsSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "ecosystem-section-designer" ? <EcosystemSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "marketplace-section-designer" ? <MarketplaceSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "rfq-section-designer" ? <RfqSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "broadcast-section-designer" ? <BroadcastSectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "capacity-section-designer" ? <CapacitySectionDesignerPage onNotice={setNotice} /> : null}
        {tab === "networking-section-designer" ? <NetworkingSectionDesignerPage onNotice={setNotice} /> : null}
      </Suspense>
      {tab === "site-rollout" ? <FrontendReleaseManager onNotice={setNotice} /> : null}
      {tab === "audit" ? <Audit /> : null}
      </DashboardShell>
    </>
  )
}

function AdminLogin({ onLogin }: { onLogin(token: string): void }) {
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const result = await platformLogin(String(data.email), String(data.password))
      onLogin(result.token)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.")
    }
  }

  return (
    <main className="admin-login">
      <section>
        <div className="admin-mark"><TirupurConnectLogo title="Tirupur Connect admin" variant="light" /></div>
        <small>Marketplace staff</small>
        <h1>Tirupur Connect administration</h1>
        <p>Review suppliers, moderate RFQs, decide verification, manage memberships, publish content, and inspect the audit trail.</p>
      </section>
      <form onSubmit={submit}>
        <small>Secure access</small>
        <h2>Sign in</h2>
        <label>Email<input name="email" required type="email" /></label>
        <label>Password<input name="password" required type="password" /></label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit">Open back office</button>
      </form>
    </main>
  )
}

function Dashboard() {
  const [data, setData] = useState<Row | null>(null)
  useEffect(() => { adminApi<Row>("/dashboard").then(setData).catch(() => undefined) }, [])
  if (!data) return null
  const cards = [
    ["Companies", data.companies, Building2],
    ["Published", data.publishedCompanies, BadgeCheck],
    ["Pending submissions", data.pendingSubmissions, Inbox],
    ["RFQs", data.rfqs, FileText],
    ["Quotes", data.quotes, FileCheck2],
    ["New inquiries", data.newInquiries, Users],
    ["Verification", data.pendingVerifications, ShieldCheck],
    ["Active memberships", data.activeMemberships, WalletCards],
  ] as const
  return (
    <div className="admin-stack">
      <section className="admin-overview">
        <div>
          <small>Marketplace operations</small>
          <h2>Review what needs attention before it reaches the public network.</h2>
          <p>Connected submissions and web-only members share one normalized marketplace workflow.</p>
        </div>
        <Settings size={48} />
      </section>
      <div className="admin-kpis">
        {cards.map(([label, value, Icon]) => (
          <article key={label}>
            <span><Icon size={21} /></span>
            <div><strong>{String(value ?? 0)}</strong><small>{label}</small></div>
          </article>
        ))}
      </div>
    </div>
  )
}

function SubmissionQueue({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const load = () => adminApi<{ records: Row[] }>("/submissions?limit=100").then((result) => setRows(result.records))
  useEffect(() => { load().catch(() => undefined) }, [])
  async function inspect(uuid: string) { setSelected(await adminApi<Row>(`/submissions/${uuid}`)) }
  async function decide(status: string) {
    if (!selected) return
    await adminApi(`/submissions/${selected.uuid}/review`, { method: "PATCH", body: JSON.stringify({ status }) })
    setSelected(null)
    await load()
    onNotice(`Submission ${status.replace("_", " ")}.`)
  }
  return (
    <AdminPanel title="Connected-client submissions" body="Every source update is an immutable revision. Approval never happens during synchronization.">
      <DataTable rows={rows} columns={["source_tenant_slug", "entity_type", "sync_version", "status", "submitted_at"]} action={(row) => <button onClick={() => inspect(String(row.uuid))}>Review</button>} />
      {selected ? (
        <div className="drawer">
          <div className="drawer-head"><h2>Submission revisions</h2><button onClick={() => setSelected(null)}>×</button></div>
          <p>{String(selected.source_tenant_slug)} · {String(selected.entity_type)} · {String(selected.external_record_uuid)}</p>
          <div className="revision-list">
            {(selected.revisions as Row[] | undefined)?.map((revision) => (
              <article key={String(revision.uuid)}>
                <strong>Revision {String(revision.revision_number)}</strong>
                <small>Sync {String(revision.sync_version)} · {String(revision.status)}</small>
                <pre>{pretty(revision.payload)}</pre>
              </article>
            ))}
          </div>
          <div className="decision-bar">
            <button onClick={() => decide("changes_requested")}>Request changes</button>
            <button onClick={() => decide("approved")}>Approve</button>
            <button className="primary" onClick={() => decide("published")}>Publish</button>
          </div>
        </div>
      ) : null}
    </AdminPanel>
  )
}

function ModerationList({ entity, onNotice }: { entity: "inquiries"; onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const load = () => adminApi<{ records: Row[] }>(`/${entity}?limit=100&search=${encodeURIComponent(search)}`).then((result) => setRows(result.records))
  useEffect(() => { load().catch(() => undefined) }, [entity])
  async function update(row: Row, status: string) {
    await adminApi(`/${entity}/${row.uuid}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    await load()
    onNotice(`${entity} record updated.`)
  }
  const columns = ["name", "company_name", "email", "status", "created_at"]
  return (
    <AdminPanel title="Inquiry desk" body="Search, review, and move records through explicit audited states.">
      <div className="table-tools">
        <label><Search size={16} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search records" value={search} /></label>
        <button onClick={load}><RefreshCw size={16} />Refresh</button>
      </div>
      <DataTable rows={rows} columns={columns} action={(row) => (
        <select onChange={(event) => update(row, event.target.value)} value={String(row.publication_status ?? row.status ?? "")}>
          <option value={String(row.publication_status ?? row.status ?? "")}>{String(row.publication_status ?? row.status ?? "Current")}</option>
          {statusOptions(entity).map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
        </select>
      )} />
    </AdminPanel>
  )
}

function VerificationQueue({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const load = () => adminApi<{ records: Row[] }>("/verifications?limit=100").then((result) => setRows(result.records))
  useEffect(() => { load().catch(() => undefined) }, [])
  async function decide(row: Row, status: string) {
    await adminApi(`/verifications/${row.uuid}/decision`, { method: "PATCH", body: JSON.stringify({ status }) })
    await load()
    onNotice(`Verification ${status.replace("_", " ")}.`)
  }
  return (
    <AdminPanel title="Verification center" body="Review evidence separately from membership billing.">
      <DataTable rows={rows} columns={["company_name", "level", "status", "created_at"]} action={(row) => (
        <div className="row-actions"><button onClick={() => decide(row, "changes_requested")}>Changes</button><button className="primary" onClick={() => decide(row, "approved")}>Approve</button></div>
      )} />
    </AdminPanel>
  )
}

function Plans({ onNotice }: { onNotice(message: string): void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await adminApi("/membership-plans", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) })
    onNotice("Membership plan saved.")
    event.currentTarget.reset()
  }
  return (
    <AdminPanel title="Membership plans" body="Manage marketplace entitlements without writing directly into billing or accounting tables.">
      <form className="admin-form" onSubmit={submit}>
        <Field label="Name" name="name" required />
        <Field label="Plan key" name="planKey" required />
        <Field label="Price in paise" name="pricePaise" type="number" />
        <Field label="Lead limit" name="leadLimit" type="number" />
        <Field label="Product limit" name="productLimit" type="number" />
        <Field label="Billing cycle" name="billingCycle" value="monthly" />
        <label className="wide">Description<textarea name="description" rows={4} /></label>
        <div className="wide form-actions"><button className="primary" type="submit">Save plan</button></div>
      </form>
    </AdminPanel>
  )
}

function ContentManager({ type, onNotice }: { type: string; onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const load = () => adminApi<{ records: Row[] }>(`/content/${type}?limit=100`).then((result) => setRows(result.records))
  useEffect(() => { setSelected(null); load().catch(() => undefined) }, [type])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const uuid = selected?.uuid ? String(selected.uuid) : ""
    await adminApi(uuid ? `/content/${type}/${uuid}` : `/content/${type}`, {
      method: uuid ? "PUT" : "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    })
    await load()
    onNotice(`${type === "article" ? "Blog article" : type} saved.`)
    setSelected(null)
    event.currentTarget.reset()
  }
  return (
    <AdminPanel title={type === "article" ? "Blog article management" : `${capitalize(type)} management`} body="Draft, edit, review, and publish marketplace content from one desk.">
      <form className="admin-form compact" key={String(selected?.uuid ?? type)} onSubmit={submit}>
        <Field label="Title" name="title" required value={textValue(selected?.title)} />
        <Field label="Slug" name="slug" value={textValue(selected?.slug)} />
        <Field label="Category" name="category" value={textValue(selected?.category)} />
        <Field label="Image URL" name="imageUrl" value={textValue(selected?.image_url)} />
        <Field label="Location" name="location" value={textValue(selected?.location)} />
        <Field label="Start date/time" name="startsAt" type="datetime-local" value={dateTimeValue(selected?.starts_at)} />
        <Field label="End date/time" name="endsAt" type="datetime-local" value={dateTimeValue(selected?.ends_at)} />
        <label>Status<select defaultValue={textValue(selected?.status) || "draft"} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        {type === "job" ? <><Field label="Company name" name="companyName" value={textValue(selected?.company_name)} /><Field label="Employment type" name="employmentType" value={textValue(selected?.employment_type)} /><Field label="Application URL" name="applicationUrl" value={textValue(selected?.application_url)} /></> : null}
        {type === "advertisement" ? <><Field label="Placement" name="placement" value={textValue(selected?.placement)} /><Field label="Target URL" name="targetUrl" value={textValue(selected?.target_url)} /></> : null}
        <label className="wide">Summary<textarea defaultValue={textValue(selected?.summary)} name="summary" rows={3} /></label>
        <label className="wide">Body / article content<textarea defaultValue={textValue(selected?.body)} name="body" rows={type === "article" ? 10 : 5} /></label>
        <div className="wide form-actions"><button type="button" onClick={() => setSelected(null)}>New</button><button className="primary" type="submit">Save {type === "article" ? "blog article" : type}</button></div>
      </form>
      <DataTable rows={rows} columns={["title", "slug", "category", "status", "updated_at"]} action={(row) => <button onClick={() => setSelected(row)}>Edit</button>} />
    </AdminPanel>
  )
}

function FrontendReleaseManager({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [channel, setChannel] = useState("public-site")
  const load = () => adminApi<{ records: Row[] }>(`/frontend-releases?channel=${encodeURIComponent(channel)}&limit=100`)
    .then((result) => setRows(result.records))

  useEffect(() => {
    setSelected(null)
    load().catch(() => undefined)
  }, [channel])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const uuid = selected?.uuid ? String(selected.uuid) : ""
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(String(data.get("payload") || "{}")) as Record<string, unknown>
    } catch {
      onNotice("Release payload must be valid JSON.")
      return
    }
    await adminApi(uuid ? `/frontend-releases/${uuid}` : "/frontend-releases", {
      method: uuid ? "PUT" : "POST",
      body: JSON.stringify({
        channel: String(data.get("channel") || channel),
        name: String(data.get("name") || ""),
        payload,
      }),
    })
    setSelected(null)
    await load()
    onNotice("Frontend release draft saved.")
  }

  async function activate(row: Row) {
    const uuid = String(row.uuid)
    await adminApi(`/frontend-releases/${uuid}/activate`, { method: "POST" })
    await load()
    onNotice(row.status === "archived" ? `Version ${row.version} restored.` : `Version ${row.version} published.`)
  }

  return (
    <AdminPanel title="Frontend content rollout" body="Prepare versioned site content, publish one release per channel, and restore an earlier release without changing code.">
      <div className="rollout-toolbar">
        <label>Channel
          <select onChange={(event) => setChannel(event.target.value)} value={channel}>
            <option value="public-site">Public site</option>
            <option value="client-portal">Client portal</option>
            <option value="admin-site">Admin site</option>
          </select>
        </label>
        <span>Published releases are immutable. Edit through a new draft.</span>
      </div>
      <form className="admin-form compact rollout-form" key={String(selected?.uuid ?? channel)} onSubmit={submit}>
        <input name="channel" type="hidden" value={channel} />
        <Field label="Release name" name="name" required value={textValue(selected?.name)} />
        <div className="release-summary">
          <span>Channel <strong>{channel.replaceAll("-", " ")}</strong></span>
          <span>Version <strong>{selected?.version ? `v${selected.version}` : "Next"}</strong></span>
          <span>Status <strong>{textValue(selected?.status) || "draft"}</strong></span>
        </div>
        <label className="wide">Content payload (JSON)
          <textarea
            defaultValue={selected?.payload ? pretty(selected.payload) : defaultFrontendPayload(channel)}
            name="payload"
            rows={18}
            spellCheck={false}
          />
        </label>
        <div className="wide form-actions">
          <button type="button" onClick={() => setSelected(null)}>New draft</button>
          <button className="primary" disabled={Boolean(selected && selected.status !== "draft")} type="submit">Save draft</button>
        </div>
      </form>
      <DataTable
        rows={rows}
        columns={["version", "name", "channel", "status", "published_at", "updated_at"]}
        action={(row) => (
          <div className="row-actions">
            <button onClick={() => setSelected(row)} type="button">{row.status === "draft" ? "Edit" : "Inspect"}</button>
            {row.status !== "published" ? <button className="primary" onClick={() => activate(row)} type="button">{row.status === "archived" ? "Restore" : "Publish"}</button> : null}
          </div>
        )}
      />
    </AdminPanel>
  )
}

function Audit() {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => { adminApi<{ records: Row[] }>("/audit?limit=100").then((result) => setRows(result.records)).catch(() => undefined) }, [])
  return <AdminPanel title="Audit trail" body="Every sensitive marketplace decision stays visible."><DataTable rows={rows} columns={["actor_type", "action", "entity_type", "entity_id", "created_at"]} /></AdminPanel>
}

function AdminPanel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return <section className="admin-panel"><div className="panel-head"><div><small>Operations</small><h2>{title}</h2><p>{body}</p></div></div>{children}</section>
}

function DataTable({ rows, columns, action }: { rows: Row[]; columns: string[]; action?: (row: Row) => ReactNode }) {
  if (!rows.length) return <div className="empty-table">No records found.</div>
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}{action ? <th>Action</th> : null}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.uuid ?? index)}>{columns.map((column) => <td key={column}>{cell(row[column])}</td>)}{action ? <td>{action(row)}</td> : null}</tr>)}</tbody></table></div>
}

function Field({ label, name, required, type = "text", value }: { label: string; name: string; required?: boolean; type?: string; value?: string }) {
  return <label>{label}<input defaultValue={value} name={name} required={required} type={type} /></label>
}

function cell(value: unknown) {
  if (value == null) return "—"
  if (typeof value === "string" && value.length > 80) return `${value.slice(0, 80)}...`
  return String(value).replaceAll("_", " ")
}

function pretty(value: unknown) {
  try { return JSON.stringify(JSON.parse(String(value)), null, 2) } catch { return String(value ?? "") }
}

function statusOptions(entity: string) {
  return entity === "inquiries" ? ["new", "assigned", "contacted", "converted", "closed", "spam"] : []
}

function contentType(tab: Tab) {
  return tab === "events" ? "event" : tab === "jobs" ? "job" : tab === "articles" ? "article" : "advertisement"
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function textValue(value: unknown) {
  return value == null ? "" : String(value)
}

function dateTimeValue(value: unknown) {
  return value ? String(value).slice(0, 16) : ""
}

function defaultFrontendPayload(channel: string) {
  return JSON.stringify({
    schemaVersion: 1,
    channel,
    sections: {},
    navigation: {},
    metadata: {},
  }, null, 2)
}

createRoot(document.getElementById("root")!).render(<StrictMode><AdminApp /></StrictMode>)
