import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import {
  BadgeCheck, BriefcaseBusiness, Building2, FileText, LayoutDashboard, Package,
  RefreshCw, Send, ShieldCheck, Sparkles, Users,
} from "lucide-react"
import { DashboardShell, getCxDesignSystem, TirupurConnectLogo, type DashboardShellNavGroup } from "@cxsun/ui"
import "@cxsun/ui/styles/dashboard-shell.css"
import { memberApi, publicApi, saveSession, storedSession, type MarketplaceSession } from "./marketplace-client"
import "./portal.css"

type PortalTab = "dashboard" | "company" | "products" | "rfqs" | "quotes" | "verification" | "membership"
type JsonRecord = Record<string, unknown>
const portalTabs: PortalTab[] = ["dashboard", "company", "products", "rfqs", "quotes", "verification", "membership"]

function isPortalTab(value: string | null): value is PortalTab {
  return portalTabs.includes(value as PortalTab)
}

function readPortalTabFromUrl(): PortalTab {
  const [, firstSegment, secondSegment] = window.location.pathname.split("/")
  if (firstSegment === "portal" && isPortalTab(secondSegment)) return secondSegment
  const params = new URLSearchParams(window.location.search)
  const value = params.get("page") ?? params.get("tab")
  return isPortalTab(value) ? value : "dashboard"
}

function writePortalTabToUrl(tab: PortalTab, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href)
  const pathTab = tab === "dashboard" ? "" : `/${tab}`
  url.pathname = `/portal${pathTab}`
  url.searchParams.delete("page")
  url.searchParams.delete("tab")
  const query = url.searchParams.toString()
  const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl === currentUrl) return
  window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", nextUrl)
}

function portalTabLabel(tab: PortalTab, role?: string) {
  if (tab === "dashboard") return "Overview"
  if (tab === "company") return "Company profile"
  if (tab === "products") return "Products"
  if (tab === "rfqs") return role === "buyer" ? "My RFQs" : "Open RFQs"
  if (tab === "quotes") return "Quotations"
  if (tab === "verification") return "Verification"
  return "Membership"
}

export function MarketplacePortal() {
  const [session, setSession] = useState<MarketplaceSession | null>(() => storedSession())
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [tab, setTab] = useState<PortalTab>(() => readPortalTabFromUrl())
  const [message, setMessage] = useState("")
  const activeLabel = portalTabLabel(tab, session?.identity.role)

  useEffect(() => {
    writePortalTabToUrl(tab, "replace")
  }, [tab])

  useEffect(() => {
    function syncFromUrl() {
      setTab(readPortalTabFromUrl())
    }

    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  useEffect(() => {
    document.title = `${activeLabel} | Tirupur Connect`
  }, [activeLabel])

  function switchTab(nextTab: PortalTab) {
    setTab(nextTab)
    writePortalTabToUrl(nextTab)
  }

  function authenticated(next: MarketplaceSession) {
    saveSession(next)
    setSession(next)
  }

  function logout() {
    saveSession(null)
    setSession(null)
    setMessage("")
    writePortalTabToUrl("dashboard", "replace")
    setTab("dashboard")
  }

  if (!session) {
    return <MarketplaceAuth mode={authMode} onMode={setAuthMode} onSession={authenticated} />
  }

  const navGroups: Array<DashboardShellNavGroup<PortalTab>> = [
    {
      id: "overview",
      label: "Overview",
      standalone: true,
      icon: LayoutDashboard,
      items: [{ id: "dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      id: "marketplace",
      label: "Marketplace",
      icon: BriefcaseBusiness,
      items: [
        { id: "company", label: portalTabLabel("company", session.identity.role), icon: Building2 },
        { id: "products", label: portalTabLabel("products", session.identity.role), icon: Package },
        { id: "rfqs", label: portalTabLabel("rfqs", session.identity.role), icon: FileText },
        { id: "quotes", label: portalTabLabel("quotes", session.identity.role), icon: Send },
      ],
    },
    {
      id: "trust-membership",
      label: "Trust",
      icon: ShieldCheck,
      items: [
        { id: "verification", label: portalTabLabel("verification", session.identity.role), icon: ShieldCheck },
        { id: "membership", label: portalTabLabel("membership", session.identity.role), icon: Sparkles },
      ],
    },
  ]
  const clientPortalDesign = getCxDesignSystem("marketplace")
  const userName = session.identity.email.split("@")[0] || session.identity.role

  return (
    <DashboardShell
      activeAppId="b2b-connect"
      activePage={tab}
      apps={[{
        id: "b2b-connect",
        name: "Tirupur Connect",
        shortName: "B2B Connect",
        description: "Buyer and supplier marketplace workspace",
        icon: BriefcaseBusiness,
      }]}
      brand={{
        logo: <TirupurConnectLogo className="portal-shared-logo" title="Tirupur Connect admin" variant="light" />,
        name: "Tirupur Connect",
        subtitle: session.identity.role.replace("-", " "),
      }}
      homeHref="/"
      navGroups={navGroups}
      navStyle={clientPortalDesign.navStyle}
      onHome={() => { window.location.href = "/" }}
      onLogout={logout}
      onNavigate={switchTab}
      rightActions={(
        <div className="portal-account portal-shared-account">
          <span>{session.identity.email}</span><BadgeCheck size={19} />
        </div>
      )}
      showAppSwitcher={false}
      title={activeLabel}
      tone={clientPortalDesign.tone}
      user={{
        displayName: userName,
        email: session.identity.email,
        roleLabel: session.identity.role.replace("-", " "),
      }}
      version="1.0.122"
    >
      <div className="portal-shared-page">
        <div className="portal-page-head">
          <div><h1>{activeLabel}</h1><p>Manage your Tirupur Connect marketplace profile, leads, verification, and membership.</p></div>
        </div>

        <section className="portal-main">
          {message ? <div className="portal-message">{message}</div> : null}
          {tab === "dashboard" ? <Dashboard session={session} onTab={switchTab} /> : null}
          {tab === "company" ? <CompanyProfile session={session} onMessage={setMessage} /> : null}
          {tab === "products" ? <Products session={session} onMessage={setMessage} /> : null}
          {tab === "rfqs" ? <Rfqs session={session} onMessage={setMessage} /> : null}
          {tab === "quotes" ? <Quotes session={session} /> : null}
          {tab === "verification" ? <Verification session={session} onMessage={setMessage} /> : null}
          {tab === "membership" ? <Membership session={session} onMessage={setMessage} /> : null}
        </section>
      </div>
    </DashboardShell>
  )
}

function MarketplaceAuth({ mode, onMode, onSession }: {
  mode: "login" | "register"
  onMode(mode: "login" | "register"): void
  onSession(session: MarketplaceSession): void
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const session = await publicApi<MarketplaceSession>(mode === "login" ? "/login" : "/register", {
        method: "POST",
        body: JSON.stringify(data),
      })
      onSession(session)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="portal-auth">
      <section className="portal-auth-story">
        <a className="portal-brand" href="/">
          <TirupurConnectLogo className="portal-logo" variant="light" />
          <span><strong>Tirupur Connect</strong><small>Textile business network</small></span>
        </a>
        <div>
          <p>Connect. Collaborate. Manufacture. Export. Grow.</p>
          <h1>Your buyer and supplier workspace for Tirupur.</h1>
          <span>Publish trusted profiles, post requirements, quote opportunities, complete verification, and grow through one focused textile network.</span>
        </div>
      </section>
      <section className="portal-auth-form">
        <div className="auth-card">
          <small>Member access</small>
          <h2>{mode === "login" ? "Welcome back" : "Create your marketplace account"}</h2>
          <p>{mode === "login" ? "Continue to your buyer or supplier desk." : "Choose your journey. You can complete the profile after registration."}</p>
          <form onSubmit={submit}>
            {mode === "register" ? <label>Name<input name="name" required /></label> : null}
            <label>Email<input name="email" required type="email" /></label>
            <label>Password<input minLength={8} name="password" required type="password" /></label>
            {mode === "register" ? (
              <>
                <label>Account type<select defaultValue="supplier" name="role"><option value="supplier">Supplier</option><option value="buyer">Buyer</option><option value="association">Association</option><option value="advertiser">Advertiser</option><option value="event-organizer">Event organizer</option><option value="candidate">Job candidate</option></select></label>
                <label>Company name<input name="companyName" /></label>
                <label>Phone<input name="phone" /></label>
              </>
            ) : null}
            {error ? <div className="form-error">{error}</div> : null}
            <button className="portal-primary" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <button className="auth-switch" onClick={() => onMode(mode === "login" ? "register" : "login")} type="button">
            {mode === "login" ? "New to Tirupur Connect? Create an account" : "Already registered? Sign in"}
          </button>
        </div>
      </section>
    </main>
  )
}

function Dashboard({ session, onTab }: { session: MarketplaceSession; onTab(tab: PortalTab): void }) {
  const [me, setMe] = useState<JsonRecord | null>(null)
  useEffect(() => { memberApi<JsonRecord>("/me", session).then(setMe).catch(() => undefined) }, [session])
  const company = me?.company as JsonRecord | null | undefined
  const completion = company ? Math.min(100, ["description", "phone", "city", "logo_url", "business_type"].filter((key) => company[key]).length * 20) : 0
  return (
    <div className="portal-stack">
      <section className="portal-welcome">
        <div><small>Marketplace workspace</small><h2>Build trust, respond faster, and keep every opportunity visible.</h2><p>Your public profile and marketplace activity live here, independent from any billing tenant.</p></div>
        <div className="completion-ring"><strong>{completion}%</strong><span>Profile complete</span></div>
      </section>
      <div className="portal-kpis">
        <Kpi icon={Building2} label="Company profile" value={company ? String(company.publication_status ?? "draft") : "Not started"} />
        <Kpi icon={Package} label="Catalog" value="Products" />
        <Kpi icon={FileText} label="Opportunities" value={session.identity.role === "buyer" ? "My RFQs" : "Open RFQs"} />
        <Kpi icon={ShieldCheck} label="Trust level" value={String(company?.verification_level ?? "None")} />
      </div>
      <div className="portal-action-grid">
        <Action title="Complete company profile" body="Add capacity, location, certifications, contact actions, and categories." onClick={() => onTab("company")} />
        <Action title={session.identity.role === "buyer" ? "Post a requirement" : "Review open RFQs"} body="Move from discovery to qualified commercial conversations." onClick={() => onTab("rfqs")} />
        <Action title="Start verification" body="Submit GST, IEC, factory, export, or premium evidence for review." onClick={() => onTab("verification")} />
      </div>
    </div>
  )
}

function CompanyProfile({ session, onMessage }: { session: MarketplaceSession; onMessage(message: string): void }) {
  const [record, setRecord] = useState<JsonRecord | null>(null)
  const [categories, setCategories] = useState<JsonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [profileTab, setProfileTab] = useState("identity")
  useEffect(() => {
    Promise.all([memberApi<JsonRecord | null>("/company", session), publicApi<JsonRecord[]>("/categories")])
      .then(([company, categoryRows]) => { setRecord(company); setCategories(categoryRows) })
      .finally(() => setLoading(false))
  }, [session])
  if (loading) return <Loading />
  if (session.identity.role === "buyer") return <Empty title="Buyer company profiles are coming next" body="Your account can post RFQs and compare supplier quotations now." />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    const categoryUuids = new FormData(event.currentTarget).getAll("categoryUuids").map(String)
    const next = await memberApi<JsonRecord>("/company", session, { method: "PUT", body: JSON.stringify({ ...data, categoryUuids }) })
    setRecord(next)
    onMessage("Company profile saved.")
  }
  async function publish() {
    await memberApi("/company/submit", session, { method: "POST", body: "{}" })
    onMessage("Profile submitted for marketplace review.")
  }
  return (
    <section className="portal-panel">
      <div className="panel-heading"><div><small>Web-only supplier record</small><h2>Company profile</h2><p>Approved changes become the public marketplace profile.</p></div><button className="portal-secondary" onClick={publish} type="button">Submit for review</button></div>
      <form className="profile-tab-form" onSubmit={submit}>
        <AnimatedProfileTabs
          value={profileTab}
          onChange={setProfileTab}
          tabs={[
            ["identity", "Details"],
            ["contact", "Contact"],
            ["person", "Person"],
            ["trade", "Trade"],
            ["media", "Media"],
            ["categories", "Categories"],
          ]}
        />
        <div className="profile-tab-panels">
          <div className={`profile-tab-panel ${profileTab === "identity" ? "active" : ""}`} aria-hidden={profileTab !== "identity"}>
            <div className="portal-form">
              <Field label="Company name" name="name" required value={record?.name} />
              <Field label="Legal name" name="legalName" value={record?.legal_name} />
              <Field label="Business type" name="businessType" value={record?.business_type} />
              <Field label="GSTIN" name="gstin" value={record?.gstin} />
              <Field label="IEC number" name="iecNumber" value={record?.iec_number} />
              <Field label="Website" name="website" value={record?.website} />
              <label className="wide">Company description<textarea defaultValue={String(record?.description ?? "")} name="description" rows={5} /></label>
            </div>
          </div>
          <div className={`profile-tab-panel ${profileTab === "contact" ? "active" : ""}`} aria-hidden={profileTab !== "contact"}>
            <div className="portal-form">
              <Field label="Email" name="email" type="email" value={record?.email} />
              <Field label="Phone" name="phone" value={record?.phone} />
              <Field label="WhatsApp" name="whatsapp" value={record?.whatsapp} />
              <Field label="City" name="city" value={record?.city} />
              <Field label="State" name="state" value={record?.state} />
              <Field label="Country" name="country" value={record?.country ?? "India"} />
              <Field label="Pincode" name="pincode" value={record?.pincode} />
            </div>
          </div>
          <div className={`profile-tab-panel ${profileTab === "person" ? "active" : ""}`} aria-hidden={profileTab !== "person"}>
            <div className="portal-form">
              <Field label="Contact person name" name="contactPersonName" value={record?.contact_person_name} />
              <Field label="Designation" name="contactPersonDesignation" value={record?.contact_person_designation} />
              <Field label="Contact person email" name="contactPersonEmail" type="email" value={record?.contact_person_email} />
              <Field label="Contact person phone" name="contactPersonPhone" value={record?.contact_person_phone} />
              <Field label="Contact person WhatsApp" name="contactPersonWhatsapp" value={record?.contact_person_whatsapp} />
            </div>
          </div>
          <div className={`profile-tab-panel ${profileTab === "trade" ? "active" : ""}`} aria-hidden={profileTab !== "trade"}>
            <div className="portal-form">
              <Field label="Monthly capacity" name="monthlyCapacity" value={record?.monthly_capacity} />
              <Field label="Minimum order quantity" name="minimumOrderQuantity" type="number" value={record?.minimum_order_quantity} />
              <Field label="Lead time" name="leadTime" value={record?.lead_time} />
            </div>
          </div>
          <div className={`profile-tab-panel ${profileTab === "media" ? "active" : ""}`} aria-hidden={profileTab !== "media"}>
            <div className="portal-form">
              <Field label="Logo URL" name="logoUrl" value={record?.logo_url} />
            </div>
          </div>
          <div className={`profile-tab-panel ${profileTab === "categories" ? "active" : ""}`} aria-hidden={profileTab !== "categories"}>
            <fieldset className="category-picker"><legend>Business categories</legend>{categories.map((category) => <label key={String(category.uuid)}><input defaultChecked={(record?.categories as JsonRecord[] | undefined)?.some((item) => item.uuid === category.uuid)} name="categoryUuids" type="checkbox" value={String(category.uuid)} />{String(category.name)}</label>)}</fieldset>
          </div>
        </div>
        <div className="form-actions wide"><button className="portal-primary" type="submit">Save profile</button></div>
      </form>
    </section>
  )
}

function AnimatedProfileTabs({ onChange, tabs, value }: { onChange(value: string): void; tabs: Array<[string, string]>; value: string }) {
  const activeIndex = Math.max(0, tabs.findIndex(([key]) => key === value))
  return (
    <div className="animated-tabs">
      <div className="animated-tabs-list" style={{ "--tab-index": activeIndex, "--tab-count": tabs.length } as CSSProperties}>
        <span className="animated-tabs-indicator" aria-hidden="true" />
        {tabs.map(([key, label]) => (
          <button className={value === key ? "active" : ""} key={key} onClick={() => onChange(key)} type="button">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Products({ session, onMessage }: { session: MarketplaceSession; onMessage(message: string): void }) {
  const [records, setRecords] = useState<JsonRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [productTab, setProductTab] = useState("details")
  const load = () => memberApi<JsonRecord[]>("/products", session).then(setRecords)
  useEffect(() => { load().catch(() => undefined) }, [session])
  if (session.identity.role === "buyer") return <Empty title="Supplier catalog only" body="Buyer accounts can discover products from the public marketplace." />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    await memberApi("/products", session, { method: "POST", body: JSON.stringify(data) })
    await load()
    setShowForm(false)
    onMessage("Product saved.")
  }
  return (
    <section className="portal-panel">
      <div className="panel-heading">
        <div><small>Marketplace catalog</small><h2>Products and services</h2></div>
        <button className="portal-primary" onClick={() => setShowForm((value) => !value)} type="button">{showForm ? "Close form" : "Add product"}</button>
      </div>
      {showForm ? (
        <form className="profile-tab-form product-tab-form compact" onSubmit={submit}>
          <AnimatedProfileTabs
            value={productTab}
            onChange={setProductTab}
            tabs={[
              ["details", "Details"],
              ["pricing", "Pricing"],
              ["delivery", "Delivery"],
              ["description", "Description"],
            ]}
          />
          <div className="profile-tab-panels">
            <div className={`profile-tab-panel ${productTab === "details" ? "active" : ""}`} aria-hidden={productTab !== "details"}>
              <div className="portal-form">
                <Field label="Name" name="name" required />
                <Field label="SKU" name="sku" />
                <Field label="Unit" name="unit" />
              </div>
            </div>
            <div className={`profile-tab-panel ${productTab === "pricing" ? "active" : ""}`} aria-hidden={productTab !== "pricing"}>
              <div className="portal-form">
                <Field label="MOQ" name="moq" type="number" />
                <Field label="Price from" name="priceFrom" type="number" />
              </div>
            </div>
            <div className={`profile-tab-panel ${productTab === "delivery" ? "active" : ""}`} aria-hidden={productTab !== "delivery"}>
              <div className="portal-form">
                <Field label="Lead time" name="leadTime" />
              </div>
            </div>
            <div className={`profile-tab-panel ${productTab === "description" ? "active" : ""}`} aria-hidden={productTab !== "description"}>
              <div className="portal-form">
                <label className="wide">Description<textarea name="description" rows={4} /></label>
              </div>
            </div>
          </div>
          <div className="form-actions wide"><button className="portal-primary" type="submit">Save product</button></div>
        </form>
      ) : null}
      <DataCards records={records} empty="No products added yet." />
    </section>
  )
}

function Rfqs({ session, onMessage }: { session: MarketplaceSession; onMessage(message: string): void }) {
  const [records, setRecords] = useState<JsonRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [quoteFor, setQuoteFor] = useState<string | null>(null)
  const load = () => memberApi<JsonRecord[]>("/rfqs", session).then(setRecords)
  useEffect(() => { load().catch(() => undefined) }, [session])
  async function createRfq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await memberApi("/rfqs", session, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) })
    await load(); setShowForm(false); onMessage("RFQ submitted for review.")
  }
  async function quote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await memberApi(`/rfqs/${quoteFor}/quotes`, session, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) })
    setQuoteFor(null); onMessage("Quotation submitted.")
  }
  return <section className="portal-panel"><div className="panel-heading"><div><small>Business opportunities</small><h2>{session.identity.role === "buyer" ? "My requirements" : "Open buyer requirements"}</h2></div>{session.identity.role === "buyer" ? <button className="portal-primary" onClick={() => setShowForm((value) => !value)} type="button">Post RFQ</button> : null}</div>{showForm ? <form className="portal-form compact" onSubmit={createRfq}><Field label="Requirement title" name="title" required /><Field label="Quantity" name="quantity" required type="number" /><Field label="Unit" name="unit" /><Field label="Target price" name="targetPrice" type="number" /><Field label="Currency" name="currency" value="INR" /><Field label="Delivery date" name="deliveryDate" type="date" /><Field label="Delivery location" name="deliveryLocation" /><label className="wide">Details<textarea name="description" rows={5} /></label><div className="form-actions wide"><button className="portal-primary" type="submit">Submit requirement</button></div></form> : null}<div className="record-list">{records.map((record) => <article className="record-row" key={String(record.uuid)}><div><small>{String(record.status)}</small><h3>{String(record.title)}</h3><p>{String(record.description ?? "No description")} · {String(record.quantity)} {String(record.unit ?? "")}</p></div>{session.identity.role !== "buyer" ? <button className="portal-secondary" onClick={() => setQuoteFor(String(record.uuid))} type="button">Quote</button> : null}</article>)}</div>{quoteFor ? <div className="portal-modal"><form className="modal-card" onSubmit={quote}><div className="panel-heading"><h2>Submit quotation</h2><button onClick={() => setQuoteFor(null)} type="button">×</button></div><Field label="Price per unit" name="pricePerUnit" required type="number" /><Field label="Total amount" name="totalAmount" type="number" /><Field label="Currency" name="currency" value="INR" /><Field label="Lead time" name="leadTime" /><label>Commercial notes<textarea name="notes" rows={5} /></label><button className="portal-primary" type="submit">Send quotation</button></form></div> : null}</section>
}

function Quotes({ session }: { session: MarketplaceSession }) {
  const [records, setRecords] = useState<JsonRecord[]>([])
  useEffect(() => { memberApi<JsonRecord[]>("/quotes", session).then(setRecords).catch(() => undefined) }, [session])
  return <section className="portal-panel"><div className="panel-heading"><div><small>Commercial responses</small><h2>Quotations</h2></div></div><DataCards records={records} empty="No quotations yet." /></section>
}

function Verification({ session, onMessage }: { session: MarketplaceSession; onMessage(message: string): void }) {
  if (session.identity.role === "buyer") return <Empty title="Supplier verification" body="Verification badges apply to supplier and association profiles." />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    await memberApi("/verification-requests", session, { method: "POST", body: JSON.stringify({ ...data, documents: data.documentUrl ? [{ type: data.documentType, url: data.documentUrl }] : [] }) })
    onMessage("Verification request submitted.")
    event.currentTarget.reset()
  }
  return <section className="portal-panel"><div className="panel-heading"><div><small>Trust center</small><h2>Request verification</h2><p>Submit evidence for review. Decisions are audited by marketplace staff.</p></div></div><form className="portal-form compact" onSubmit={submit}><label>Verification level<select name="level"><option value="basic">Basic verified</option><option value="gst">GST verified</option><option value="iec">IEC verified</option><option value="factory">Factory verified</option><option value="export">Export verified</option><option value="premium">Premium verified</option></select></label><Field label="Document type" name="documentType" value="certificate" /><Field label="Private document URL" name="documentUrl" /><label className="wide">Notes<textarea name="notes" rows={5} /></label><div className="form-actions wide"><button className="portal-primary" type="submit">Submit verification</button></div></form></section>
}

function Membership({ session, onMessage }: { session: MarketplaceSession; onMessage(message: string): void }) {
  const [plans, setPlans] = useState<JsonRecord[]>([])
  useEffect(() => { publicApi<JsonRecord[]>("/membership-plans").then(setPlans).catch(() => undefined) }, [])
  async function select(uuid: string) {
    const result = await memberApi<{ paymentRequired: boolean; uuid: string }>(`/memberships/${uuid}/select`, session, { method: "POST", body: "{}" })
    onMessage(result.paymentRequired ? "Membership selected. Payment can now be initiated." : "Free membership activated.")
  }
  return <section className="portal-panel"><div className="panel-heading"><div><small>Visibility and lead access</small><h2>Membership plans</h2></div></div><div className="membership-grid">{plans.map((plan) => <article key={String(plan.uuid)}><small>{String(plan.billing_cycle)}</small><h3>{String(plan.name)}</h3><strong>₹{(Number(plan.price_paise) / 100).toLocaleString("en-IN")}</strong><p>{String(plan.description ?? "")}</p><button className="portal-primary" onClick={() => select(String(plan.uuid))} type="button">Choose {String(plan.name)}</button></article>)}</div></section>
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <article><span><Icon size={22} /></span><div><small>{label}</small><strong>{value}</strong></div></article>
}
function Action({ title, body, onClick }: { title: string; body: string; onClick(): void }) {
  return <button onClick={onClick} type="button"><span><Sparkles size={20} /></span><strong>{title}</strong><small>{body}</small></button>
}
function Field({ label, name, required, type = "text", value }: { label: string; name: string; required?: boolean; type?: string; value?: unknown }) {
  return (
    <label className="portal-field">
      <span>{label}{required ? <em aria-hidden="true">*</em> : null}</span>
      <input defaultValue={value == null ? "" : String(value)} name={name} required={required} type={type} />
    </label>
  )
}
function DataCards({ records, empty }: { records: JsonRecord[]; empty: string }) {
  if (!records.length) return <Empty title={empty} body="New activity will appear here." />
  return <div className="data-card-grid">{records.map((record, index) => <article key={String(record.uuid ?? index)}><small>{String(record.status ?? record.publication_status ?? "active")}</small><h3>{String(record.name ?? record.title ?? record.rfq_title ?? "Record")}</h3><p>{String(record.description ?? record.notes ?? record.company_name ?? record.supplier_company_name ?? "")}</p></article>)}</div>
}
function Empty({ title, body }: { title: string; body: string }) { return <div className="portal-empty"><Users size={30} /><h3>{title}</h3><p>{body}</p></div> }
function Loading() { return <div className="portal-empty"><RefreshCw className="spin" size={28} /><p>Loading marketplace data…</p></div> }
