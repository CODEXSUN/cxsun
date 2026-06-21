import { useEffect, useState, type FormEvent } from "react"
import { ArrowRight, Building2, CalendarDays, FileText, MapPin, Package, RefreshCw } from "lucide-react"
import { publicApi } from "./marketplace-client"

type Row = Record<string, unknown>

export function LiveCategoryDirectory() {
  const [categories, setCategories] = useState<Row[]>([])
  useEffect(() => { publicApi<Row[]>("/categories").then(setCategories).catch(() => undefined) }, [])
  if (!categories.length) return <LiveEmpty label="Marketplace categories are being prepared." />
  return <div className="live-category-grid">{categories.map((category) => <article key={String(category.uuid)}><span>{initials(String(category.name))}</span><div><h3>{String(category.name)}</h3><p>{String(category.description ?? "Search companies, products, and capabilities in this textile category.")}</p></div></article>)}</div>
}

export function LiveCompanyDirectory() {
  const [companies, setCompanies] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadCompanies("", setCompanies, setLoading) }, [])
  function submit(event: FormEvent) { event.preventDefault(); loadCompanies(search, setCompanies, setLoading) }
  return <div className="live-directory"><form className="live-search" onSubmit={submit}><input onChange={event => setSearch(event.target.value)} placeholder="Search company, product, capability…" value={search}/><button type="submit">Search marketplace</button></form>{loading?<LiveLoading/>:companies.length?<div className="live-company-grid">{companies.map(company=><article key={String(company.uuid)}><div className="live-company-cover">{company.cover_url?<img alt="" src={String(company.cover_url)}/>:<Building2 size={38}/>}<span>{String(company.verification_level??"Listed")}</span></div><div className="live-company-body"><small>{String(company.business_type??"Textile business")}</small><h3>{String(company.name)}</h3><p><MapPin size={14}/>{[company.city,company.state].filter(Boolean).join(", ")||"Tirupur textile network"}</p><div><span>MOQ {String(company.minimum_order_quantity??"Ask")}</span><span>{String(company.lead_time??"Lead time on request")}</span></div><a href="/portal">Send inquiry <ArrowRight size={15}/></a></div></article>)}</div>:<LiveEmpty label="No published companies match this search yet."/>}</div>
}

export function LiveProducts() {
  const [records,setRecords]=useState<Row[]>([])
  useEffect(()=>{publicApi<{records:Row[]}>("/products?limit=6").then(result=>setRecords(result.records)).catch(()=>undefined)},[])
  if(!records.length)return <LiveEmpty label="Published supplier products will appear here."/>
  return <div className="live-product-grid">{records.map(record=><article key={String(record.uuid)}><span><Package size={25}/></span><small>{String(record.category_name??"Marketplace product")}</small><h3>{String(record.name)}</h3><p>{String(record.description??`${record.company_name??"Supplier"} marketplace catalog`)}</p><div><b>{record.price_from?`From ₹${Number(record.price_from).toLocaleString("en-IN")}`:"Price on request"}</b><em>MOQ {String(record.moq??"Ask")}</em></div></article>)}</div>
}

export function LiveRfqs() {
  const [records,setRecords]=useState<Row[]>([])
  useEffect(()=>{publicApi<{records:Row[]}>("/rfqs?limit=6").then(result=>setRecords(result.records)).catch(()=>undefined)},[])
  if(!records.length)return <LiveEmpty label="Approved public buyer requirements will appear here."/>
  return <div className="live-rfq-list">{records.map(record=><article key={String(record.uuid)}><span><FileText size={22}/></span><div><small>{String(record.category_name??"Buyer requirement")}</small><h3>{String(record.title)}</h3><p>{String(record.quantity)} {String(record.unit??"units")} · {String(record.delivery_location??"Delivery location to discuss")}</p></div><a href="/portal">Quote RFQ</a></article>)}</div>
}

export function LivePlans() {
  const [plans,setPlans]=useState<Row[]>([])
  useEffect(()=>{publicApi<Row[]>("/membership-plans").then(setPlans).catch(()=>undefined)},[])
  if(!plans.length)return <LiveEmpty label="Membership plans are being prepared."/>
  return <div className="plan-grid">{plans.map(plan=><article className={`plan-card ${plan.plan_key==="gold"?"featured":""}`} key={String(plan.uuid)}><p>{String(plan.name)}</p><h3>Rs {(Number(plan.price_paise)/100).toLocaleString("en-IN")}<span>/month</span></h3><small>{String(plan.description??"Marketplace visibility and lead access.")}</small><ul>{parseList(plan.features).map(item=><li key={item}>{item}</li>)}</ul><a className="live-plan-link" href="/portal">Choose plan</a></article>)}</div>
}

export function LiveNewsEvents() {
  const [events,setEvents]=useState<Row[]>([]);const [jobs,setJobs]=useState<Row[]>([]);const [articles,setArticles]=useState<Row[]>([])
  useEffect(()=>{Promise.all([publicApi<{records:Row[]}>("/events?limit=3"),publicApi<{records:Row[]}>("/jobs?limit=3"),publicApi<{records:Row[]}>("/articles?limit=3")]).then(([eventRows,jobRows,articleRows])=>{setEvents(eventRows.records);setJobs(jobRows.records);setArticles(articleRows.records)}).catch(()=>undefined)},[])
  return <div className="live-content-columns"><ContentColumn icon={CalendarDays} label="Events" records={events}/><ContentColumn icon={Building2} label="Jobs" records={jobs}/><ContentColumn icon={FileText} label="News" records={articles}/></div>
}

function ContentColumn({icon:Icon,label,records}:{icon:typeof CalendarDays;label:string;records:Row[]}){return <article><span><Icon size={22}/>{label}</span>{records.length?records.map(record=><div key={String(record.uuid)}><h3>{String(record.title)}</h3><p>{String(record.summary??record.location??"Published marketplace update")}</p></div>):<p>No published {label.toLowerCase()} yet.</p>}</article>}
function LiveEmpty({label}:{label:string}){return <div className="live-empty"><RefreshCw size={22}/><p>{label}</p></div>}
function LiveLoading(){return <div className="live-empty"><RefreshCw className="spin" size={22}/><p>Loading live marketplace…</p></div>}
function initials(value:string){return value.split(/\s+/).map(word=>word[0]).slice(0,3).join("").toUpperCase()}
function parseList(value:unknown):string[]{try{const parsed=JSON.parse(String(value));return Array.isArray(parsed)?parsed.map(String):[]}catch{return String(value??"").split(",").map(item=>item.trim()).filter(Boolean)}}
function loadCompanies(search:string,setCompanies:(rows:Row[])=>void,setLoading:(value:boolean)=>void){setLoading(true);publicApi<{records:Row[]}>(`/companies?limit=12&search=${encodeURIComponent(search)}`).then(result=>setCompanies(result.records)).finally(()=>setLoading(false))}
