import { StrictMode, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { ArrowRight, ArrowUpRight, Award, BadgeCheck, BarChart3, BellRing, Bot, Building2, ChevronDown, Factory, FileCheck2, FileText, Globe2, Handshake, IndianRupee, Leaf, MessageCircle, PackageCheck, QrCode, ScanSearch, Send, ShieldCheck, Smartphone, TrendingUp, Users } from "lucide-react"
import { PublicSlider, type PublicSliderSlide } from "./PublicSlider"
import { CardGrid, DevBadge, ImageStory, PublicSection, Reveal, type ImageStorySlide, type SectionTone } from "./public-sections"
import { TirupurConnectGlobalLoader, TirupurConnectLogo } from "@cxsun/ui"
import { MarketplacePortal } from "./MarketplacePortal"
import { LiveCategoryDirectory, LiveCompanyDirectory, LiveNewsEvents, LivePlans, LiveProducts, LiveRfqs } from "./LiveMarketplace"
import { publicApi } from "./marketplace-client"
import { ThemeProvider, ThemeToggle } from "./theme"
import "./styles.css"

const brandTagline = "Connecting Global Buyers with Trusted Textile & Garment Manufacturers"

type HomeSliderInsight = {
  icon: string
  label: string
  tone: "blue" | "emerald" | "orange" | "violet"
  value: string
}

type HomeSliderSlide = PublicSliderSlide & {
  card: {
    body: string
    eyebrow: string
    title: string
  }
  insights: HomeSliderInsight[]
}

type ContentRow = {
  uuid: string
  title: string
  slug: string
  summary: string | null
  excerpt?: string | null
  body: string | null
  image_url: string | null
  category: string | null
  tags?: Array<{ name: string; slug: string; uuid: string }>
  comments?: BlogComment[]
  related?: ContentRow[]
  seo_title?: string | null
  seo_description?: string | null
  allow_comments?: number
  published_at: string | null
  updated_at: string
}

type BlogComment = {
  uuid: string
  parent_uuid?: string | null
  author_name: string
  body: string
  created_at: string
  replies?: BlogComment[]
}

type FrontendDesignerItem = {
  uuid: string
  item_key: string
  eyebrow: string | null
  title: string
  summary: string | null
  body: string | null
  image_url: string | null
  target_url: string | null
  content: Record<string, unknown>
}

type FrontendDesignerSection = {
  section_key: string
  eyebrow: string | null
  title: string | null
  body: string | null
  settings: Record<string, unknown>
  items: FrontendDesignerItem[]
}

type FrontendDesignerPage = {
  sections: FrontendDesignerSection[]
}

let frontendHomePageRequest: Promise<FrontendDesignerPage> | null = null

type WhyStoryContent = {
  eyebrow: string
  title: string
  body: string
  label: string
  headline: string
  image: string
  slides: ImageStorySlide[]
}

type DirectorySectionContent = {
  eyebrow: string
  title: string
  body: string
  tone: SectionTone
}

type SimplePublicCard = {
  body: string
  eyebrow: string
  title: string
}

type CapacitySectionContent = DirectorySectionContent & {
  image: string
  items: string[]
  label: string
  reverse: boolean
  storyTitle: string
}

const textileRollsImage = "https://images.unsplash.com/photo-1534639077088-d702bcf685e7?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const knittedFabricRollsImage = "https://images.unsplash.com/photo-1771098206672-8996549a59f2?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const spinningLineImage = "https://images.unsplash.com/photo-1742281693317-c711080e8a19?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const knittingMachineImage = "https://images.unsplash.com/photo-1612685180040-e120061d47e3?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const dyeingUnitImage = "https://images.unsplash.com/photo-1534639077088-d702bcf685e7?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const garmentFactoryImage = "https://images.unsplash.com/photo-1742934029782-f2e6e5f0e169?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const tshirtStackImage = "https://images.unsplash.com/photo-1710440189404-e95fabead2a3?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const fabricStackImage = "https://images.unsplash.com/photo-1771098206672-8996549a59f2?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const embroideryMachineImage = "https://images.unsplash.com/photo-1654110509803-4f53e0f9c192?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const accessoriesImage = "https://images.unsplash.com/photo-1654108890964-dd31a9cf3793?auto=format&fit=crop&fm=jpg&q=84&w=1800"
const sourcingMeetingImage = "https://images.unsplash.com/photo-1741183396974-7a4b21d52e11?auto=format&fit=crop&fm=jpg&q=84&w=1800"

const homeSliderSlides: HomeSliderSlide[] = [
  {
    id: "home-slider-1",
    eyebrow: "Tirupur textile network",
    title: "The digital business operating system for Tirupur's textile and garment industry",
    body: "Connect, collaborate, manufacture, export, and grow through one focused B2B platform for suppliers, exporters, buyers, job-work units, service providers, associations, and talent.",
    image: spinningLineImage,
    imagePosition: "center",
    card: {
      eyebrow: "Network map",
      title: "From yarn to export dispatch in one searchable supplier graph",
      body: "Build verified company profiles for every part of Tirupur's knitwear value chain.",
    },
    insights: [
      { icon: "Y", label: "Yarn and spinning", tone: "blue", value: "Mills" },
      { icon: "K", label: "Knitting units", tone: "emerald", value: "Live" },
      { icon: "G", label: "Garment makers", tone: "orange", value: "Export" },
      { icon: "B", label: "Buyer RFQs", tone: "violet", value: "24x7" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-2",
    eyebrow: "Circular knitting",
    title: "Find knitting capacity by gauge, fabric type, machine strength, and delivery window",
    body: "Let fabric buyers discover circular knitting units, job-work capacity, jersey, rib, interlock, fleece, and export-ready knitted fabric sources.",
    image: knittingMachineImage,
    imagePosition: "center 46%",
    card: {
      eyebrow: "Capacity exchange",
      title: "Knitting unit profile with available capacity, machines, and fabric specialization",
      body: "Suppliers can publish monthly capacity while buyers filter by fabric, lead time, and location.",
    },
    insights: [
      { icon: "24", label: "Gauge filters", tone: "blue", value: "Ready" },
      { icon: "KG", label: "Daily capacity", tone: "emerald", value: "Kg" },
      { icon: "JO", label: "Job work", tone: "orange", value: "Open" },
      { icon: "QC", label: "Quality notes", tone: "violet", value: "Logged" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-3",
    eyebrow: "Dyeing and processing",
    title: "Route fabric dyeing, compacting, washing, finishing, and processing inquiries faster",
    body: "Buyers can search dyeing and processing partners by color capability, batch size, compliance readiness, and turnaround.",
    image: dyeingUnitImage,
    imagePosition: "center 55%",
    card: {
      eyebrow: "Processing workflow",
      title: "Dyeing units need trust, compliance, capacity, and sample response visibility",
      body: "Track category, shade capability, GST profile, and buyer inquiries in one place.",
    },
    insights: [
      { icon: "LAB", label: "Lab dip support", tone: "blue", value: "Fast" },
      { icon: "BTH", label: "Batch tracking", tone: "emerald", value: "Yes" },
      { icon: "ECO", label: "Compliance", tone: "orange", value: "Badge" },
      { icon: "TAT", label: "Turnaround", tone: "violet", value: "Days" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-4",
    eyebrow: "Garment manufacturing",
    title: "Connect buyers with stitching units, factories, exporters, and make-to-order teams",
    body: "Profiles can show production lines, machine count, MOQ, monthly capacity, product category, certifications, and export markets.",
    image: garmentFactoryImage,
    imagePosition: "center 42%",
    card: {
      eyebrow: "Factory profile",
      title: "Manufacturing pages should show what a buyer checks before sending tech packs",
      body: "Capacity, compliance, team size, product focus, sample timeline, and verified contact actions.",
    },
    insights: [
      { icon: "MOQ", label: "Order quantity", tone: "blue", value: "Filter" },
      { icon: "LINE", label: "Production lines", tone: "emerald", value: "Count" },
      { icon: "SAM", label: "Sampling", tone: "orange", value: "Track" },
      { icon: "EXP", label: "Export ready", tone: "violet", value: "Badge" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-5",
    eyebrow: "Knitted garments",
    title: "Showcase polos, t-shirts, hoodies, kidswear, innerwear, and activewear manufacturers",
    body: "Tirupur Connect can become the first screen buyers open when they need trusted knitted garment capacity from Tamil Nadu.",
    image: tshirtStackImage,
    imagePosition: "center",
    card: {
      eyebrow: "Product catalog",
      title: "Colorful garment catalog cards make suppliers easy to compare",
      body: "Every company can publish products, images, MOQ, fabrics, sizes, and buyer-ready quotation actions.",
    },
    insights: [
      { icon: "TEE", label: "T-shirt makers", tone: "blue", value: "Listed" },
      { icon: "POLO", label: "Polo capacity", tone: "emerald", value: "Live" },
      { icon: "KID", label: "Kidswear", tone: "orange", value: "Search" },
      { icon: "FIT", label: "Activewear", tone: "violet", value: "RFQ" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-6",
    eyebrow: "Fabric sourcing",
    title: "Make fabric suppliers discoverable by GSM, composition, finish, pattern, and stock position",
    body: "Support fabric mills, traders, stockists, knitted fabric suppliers, and special fabric sellers with fast search and RFQ matching.",
    image: fabricStackImage,
    imagePosition: "center",
    card: {
      eyebrow: "Fabric intelligence",
      title: "Buyers search by composition, GSM, width, finish, and available quantity",
      body: "A fabric profile can carry catalog images, stock notes, sample availability, and price indication.",
    },
    insights: [
      { icon: "GSM", label: "GSM filter", tone: "blue", value: "Core" },
      { icon: "COT", label: "Cotton blends", tone: "emerald", value: "Map" },
      { icon: "STK", label: "Stock lots", tone: "orange", value: "Fast" },
      { icon: "SMP", label: "Sample ready", tone: "violet", value: "Yes" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-7",
    eyebrow: "Embroidery and printing",
    title: "Bring job-work units into the buyer flow for embroidery, print, labels, and finishing",
    body: "Decoration and value-add units can publish machines, design capability, turnaround, order minimums, and portfolio visuals.",
    image: embroideryMachineImage,
    imagePosition: "center 42%",
    card: {
      eyebrow: "Job-work discovery",
      title: "Embroidery, print, and finishing units need portfolio-first visibility",
      body: "Profiles can carry machine details, sample work, buyer inquiry buttons, and verification badges.",
    },
    insights: [
      { icon: "EMB", label: "Embroidery heads", tone: "blue", value: "Count" },
      { icon: "PRN", label: "Printing units", tone: "emerald", value: "Route" },
      { icon: "ART", label: "Artwork support", tone: "orange", value: "Yes" },
      { icon: "FIN", label: "Finishing", tone: "violet", value: "Link" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-8",
    eyebrow: "Accessories and trims",
    title: "Connect garment factories with labels, buttons, zippers, thread, packing, and trims suppliers",
    body: "Accessory suppliers often decide delivery speed. Make them searchable by category, stock, MOQ, color options, and dispatch promise.",
    image: accessoriesImage,
    imagePosition: "center",
    card: {
      eyebrow: "Supply support",
      title: "Accessories suppliers become visible exactly when factories need fast purchase support",
      body: "Show available categories, color families, sample support, delivery terms, and WhatsApp ordering.",
    },
    insights: [
      { icon: "LBL", label: "Labels", tone: "blue", value: "Ready" },
      { icon: "BTN", label: "Buttons", tone: "emerald", value: "Stock" },
      { icon: "ZIP", label: "Zippers", tone: "orange", value: "Search" },
      { icon: "PKG", label: "Packing", tone: "violet", value: "Route" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-9",
    eyebrow: "RFQ and lead engine",
    title: "Business opportunities first. Directory listing second.",
    body: "Buyers post requirements, suppliers receive matched alerts, paid members unlock contacts, and every lead moves through quote, negotiation, and follow-up.",
    image: sourcingMeetingImage,
    imagePosition: "center 45%",
    card: {
      eyebrow: "Live RFQ example",
      title: "Need 25,000 cotton polo T-shirts for Germany",
      body: "Matching verified suppliers receive app, email, and WhatsApp-ready alerts.",
    },
    insights: [
      { icon: "2K", label: "Free companies target", tone: "blue", value: "2,000+" },
      { icon: "100", label: "Year-one paid members", tone: "emerald", value: "100+" },
      { icon: "5", label: "Verification levels", tone: "orange", value: "5" },
      { icon: "24", label: "RFQ alerts", tone: "violet", value: "24x7" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
  {
    id: "home-slider-10",
    eyebrow: "Verified trust network",
    title: "Build a supplier graph that buyers can trust before they call",
    body: "GST, IEC, factory, export, association, and premium verification badges make discovery faster and help serious suppliers stand out.",
    image: textileRollsImage,
    imagePosition: "center 48%",
    card: {
      eyebrow: "Trust layer",
      title: "Verification badges turn local search into buyer confidence",
      body: "GST, IEC, factory, export, association, and premium verification can become a paid trust product.",
    },
    insights: [
      { icon: "GST", label: "GST verified", tone: "blue", value: "Badge" },
      { icon: "IEC", label: "Exporter profile", tone: "emerald", value: "Ready" },
      { icon: "FAC", label: "Factory check", tone: "orange", value: "Audit" },
      { icon: "QR", label: "QR profile", tone: "violet", value: "Share" },
    ],
    actions: [
      { label: "Explore directory", target: "directory" },
      { label: "Post requirement", target: "rfq", variant: "ghost" },
    ],
  },
]

const ecosystemCards = [
  {
    eyebrow: "Business directory",
    title: "Search by category, product, service, capacity, location, exporter status, and certification.",
    body: "Directory cards expose the right decision signals: verification, MOQ, capacity, lead time, location, response speed, and premium visibility.",
  },
  {
    eyebrow: "Digital profile",
    title: "Every company gets a mini website and QR business card.",
    body: "Logo, banner, catalog, factory photos, videos, certificates, machinery, export markets, map, WhatsApp, call, email, inquiry, and report actions.",
  },
  {
    eyebrow: "Verified supplier",
    title: "Trust score and badge stack for serious suppliers.",
    body: "Basic, GST, IEC, factory, export, premium, association, and renewal checks can become a paid annual verification product.",
  },
  {
    eyebrow: "RFQ marketplace",
    title: "Buyers post requirements and suppliers quote with proposals.",
    body: "Garments, fabrics, yarn, printing, embroidery, job work, and export inquiries flow through matched suppliers and lead-credit rules.",
  },
  {
    eyebrow: "Capacity exchange",
    title: "Convert idle production capacity into live business.",
    body: "Knitting, dyeing, printing, embroidery, stitching, washing, and finishing units can publish available capacity and fill gaps faster.",
  },
  {
    eyebrow: "Networking",
    title: "Textile industry's own professional network.",
    body: "Companies follow each other, post updates, share opportunities, message, comment, and build daily engagement around trade.",
  },
]

const rfqSteps = [
  { body: "Buyer adds product, quantity, target price, delivery date, destination, certifications, and attachments.", icon: Send, label: "Buyer requirement", title: "Post", tone: "blue" },
  { body: "System routes the RFQ to suppliers by category, capacity, location, verification, and membership entitlement.", icon: ScanSearch, label: "Supplier discovery", title: "Match", tone: "emerald" },
  { body: "Suppliers submit quotations, upload proposals, ask questions, or mark not interested.", icon: FileText, label: "Commercial response", title: "Quote", tone: "orange" },
  { body: "Buyer compares offers, reveals contact, negotiates, and moves the opportunity into CRM follow-up.", icon: Handshake, label: "Business conversion", title: "Convert", tone: "violet" },
]

type RfqStep = typeof rfqSteps[number]

const marketplaceCatalogCards = [
  { body: "Fabric suppliers can list GSM, composition, width, finish, color family, sample support, and stock availability.", eyebrow: "Fabric", title: "Knitted and woven fabric discovery" },
  { body: "Yarn suppliers can publish counts, blends, mill origin, MOQ, cone details, and dispatch promise.", eyebrow: "Yarn", title: "Yarn and raw-material listings" },
  { body: "Labels, buttons, zippers, thread, packing, hang tags, trims, and consumables become searchable by category.", eyebrow: "Accessories", title: "Accessories and trims marketplace" },
  { body: "Move leftover fabric, surplus stock, seconds, ready garments, and urgent inventory with clear quantity and pricing notes.", eyebrow: "Surplus", title: "Leftover inventory and stock lots" },
  { body: "Manufacturers can show t-shirts, polos, hoodies, kidswear, innerwear, activewear, and custom programs.", eyebrow: "Garments", title: "Ready garments and make-to-order" },
  { body: "Machine suppliers and service providers can publish textile machinery, spares, AMC support, and installation services.", eyebrow: "Machinery", title: "Machinery and textile services" },
]

const broadcastSteps = [
  { body: "Buyer requirement is captured with product, quantity, destination, timeline, certification, and attachments.", icon: Send, label: "Requirement captured", tone: "blue" },
  { body: "Matching suppliers are selected by category, product capability, capacity, location, trust level, and plan access.", icon: ScanSearch, label: "Supplier matching", tone: "emerald" },
  { body: "Mobile push, WhatsApp, and email alerts reach relevant suppliers quickly so the lead does not go cold.", icon: BellRing, label: "Instant broadcast", tone: "orange" },
  { body: "Supplier responses, quotes, questions, and follow-ups are tracked for buyer comparison and conversion.", icon: Handshake, label: "Response tracking", tone: "violet" },
]

type BroadcastStep = typeof broadcastSteps[number]

const networkingCards = [
  { body: "Companies and professionals can follow one another to build a textile-first business graph.", eyebrow: "Follow", title: "Follow companies and professionals" },
  { body: "Publish business updates, capacity openings, new products, certificates, event visits, and buyer-ready announcements.", eyebrow: "Post", title: "Share textile business updates" },
  { body: "Comment, like, discuss market movement, ask sourcing questions, and create introductions through trusted context.", eyebrow: "Discuss", title: "Industry discussions and introductions" },
  { body: "Associations, job-work units, buying offices, exporters, and service partners can keep the ecosystem active every day.", eyebrow: "Engage", title: "Daily network engagement" },
]

const qrProfileCards = [
  { body: "Each supplier receives a public profile URL that works like a focused mini website.", eyebrow: "Public URL", title: "Shareable company profile" },
  { body: "QR cards can be printed on visiting cards, catalogs, invoices, stands, stickers, and trade fair booths.", eyebrow: "QR code", title: "Scan-ready buyer access" },
  { body: "Catalog, products, contact person, WhatsApp, map, certificates, and inquiry buttons stay available from one scan.", eyebrow: "Catalog", title: "Product and contact hub" },
]

const exportIntelligenceCards = [
  { body: "Track country-wise export movement, product demand, and buyer-market opportunities for Tirupur categories.", eyebrow: "Market trends", title: "Country-wise export trends" },
  { body: "Premium members can monitor product demand, currency movement, trade statistics, and timely export alerts.", eyebrow: "Alerts", title: "Global opportunity signals" },
  { body: "Knowledge guides cover export documentation, LC/DA/DP basics, GST, MSME schemes, and compliance checklists.", eyebrow: "Guides", title: "Export knowledge library" },
]

const financeCards = [
  { body: "Connect SMEs with working-capital providers based on business profile, invoices, RFQ pipeline, and verification strength.", eyebrow: "Working capital", title: "Cash-flow support for factories" },
  { body: "Enable invoice discounting, factoring, export finance, insurance, and referral-led financial services.", eyebrow: "Finance marketplace", title: "Lenders, factors, and insurers" },
  { body: "Revenue can come through verified referral partnerships while members receive faster access to relevant finance options.", eyebrow: "Revenue", title: "Partner-led finance referrals" },
]

const aiAssistantPrompts = [
  "Find dyeing units in Tirupur.",
  "Need kidswear exporters.",
  "Find embroidery units with available capacity.",
  "Explain DA and DP export terms.",
]

const advertisingCards = [
  { body: "Homepage and category banners can promote suppliers, associations, events, offers, and buyer campaigns.", eyebrow: "Banners", title: "Homepage and category visibility" },
  { body: "Featured company slots help paid members stand above normal directory results.", eyebrow: "Featured", title: "Featured companies and premium placement" },
  { body: "Sponsored posts, event sponsorships, and promoted RFQs add recurring revenue without changing the core product.", eyebrow: "Sponsored", title: "Sponsored posts and events" },
]

const mobileCards = [
  { body: "Suppliers receive RFQ alerts, lead notifications, saved company updates, chat prompts, and follow-up reminders.", eyebrow: "Notifications", title: "Instant lead and RFQ alerts" },
  { body: "Users can save companies, leads, products, and contacts for later action from mobile.", eyebrow: "Saved work", title: "Saved companies and leads" },
  { body: "WhatsApp integration keeps local business behavior familiar while the platform keeps the business record.", eyebrow: "WhatsApp", title: "Chat and contact actions" },
]

const crmLiteCards = [
  { body: "Members can manage leads from RFQs, profile inquiries, contact reveals, events, and manual opportunities.", eyebrow: "Leads", title: "Lead pipeline for textile SMEs" },
  { body: "Track follow-ups, quotations, notes, tasks, reminders, and next action dates without a heavy CRM.", eyebrow: "Follow-up", title: "Simple follow-up discipline" },
  { body: "Premium plans can unlock team access, lead assignment, quote history, and conversion reporting.", eyebrow: "Premium", title: "CRM Lite as upgrade path" },
]

const languageCards = [
  { body: "English keeps exporter, buyer, and professional service communication clear.", eyebrow: "English", title: "Buyer and export language" },
  { body: "Tamil supports wider factory, job-work, association, and local-service adoption.", eyebrow: "Tamil", title: "Local industry adoption" },
  { body: "Hindi helps with wider Indian supplier, buyer, worker, and trade-service reach.", eyebrow: "Hindi", title: "National business reach" },
]

const associations = [
  {
    name: "TEAMA",
    fullName: "Tirupur Exporters and Manufacturers Association",
    body: "Exporter and manufacturer community for certifications, export credit guidance, market updates, and global exposure.",
    href: "https://teamaindia.com/",
    logo: "/associations/teama.png",
    logoAlt: "TEAMA logo",
    tone: "orange",
  },
  {
    name: "TEA",
    fullName: "Tiruppur Exporters' Association",
    body: "Long-running exporters' association and industry directory for Tirupur knitwear and related supplier categories.",
    href: "https://tea-india.org/",
    logo: "/associations/tea.png",
    logoAlt: "Tiruppur Exporters' Association logo",
    tone: "green",
  },
  {
    name: "The Tirupur Textiles",
    fullName: "Common buying office",
    body: "A potential buying-office partner surface for shared sourcing, buyer requirements, supplier discovery, and export coordination.",
    href: "#contact",
    logo: "/associations/tirupur-textiles.png",
    logoAlt: "The Tirupur Textiles logo",
    tone: "navy",
  },
  {
    name: "TAEF",
    fullName: "Tamil Nadu All Entrepreneurs Federation",
    body: "Entrepreneur network that can support MSME discovery, policy awareness, events, and local business participation.",
    href: "#contact",
    mark: "TAEF",
    tone: "gold",
  },
  {
    name: "NIFT-TEA",
    fullName: "Knitwear fashion and skills ecosystem",
    body: "Useful education and skill-development partner for jobs, training, design talent, and industry-ready workforce programs.",
    href: "https://www.nifttea.ac.in/",
    logo: "/associations/nift-tea.png",
    logoAlt: "NIFT-TEA logo",
    tone: "teal",
  },
  {
    name: "Clusters and Sister Concerns",
    fullName: "Coimbatore, Erode, Karur, and future textile networks",
    body: "Regional expansion paths for yarn, processing, home textiles, sourcing, finance, jobs, and assisted buying offices.",
    href: "#expansion",
    logo: "/associations/tirupur-connect.svg",
    logoAlt: "Tirupur Connect network logo",
    tone: "blue",
  },
]

const reportKpis = [
  {
    change: "+12.4%",
    compare: "12,72 38,68 64,60 90,63 116,49 142,53 168,39 194,43",
    icon: Building2,
    label: "Listed companies",
    note: "780 verified",
    tone: "blue",
    trend: "12,78 38,64 64,68 90,44 116,52 142,26 168,34 194,10",
    trendLabel: "780 verified",
    value: "2,500+",
  },
  {
    change: "+18.6%",
    compare: "12,74 38,71 64,66 90,58 116,62 142,48 168,45 194,36",
    icon: TrendingUp,
    label: "Monthly opportunities",
    note: "68% receive quotes",
    tone: "emerald",
    trend: "12,80 38,66 64,71 90,50 116,54 142,31 168,24 194,9",
    trendLabel: "331 quoted",
    value: "486",
  },
  {
    change: "+24.1%",
    compare: "12,76 38,70 64,72 90,57 116,54 142,43 168,38 194,31",
    icon: IndianRupee,
    label: "Business connected",
    note: "Qualified order value",
    tone: "orange",
    trend: "12,82 38,70 64,74 90,52 116,58 142,28 168,16 194,12",
    trendLabel: "Rs 92L this month",
    value: "Rs 4.8 Cr",
  },
]

const monthlyMovement = [
  { label: "Jan", orders: 38, rfqs: 54 },
  { label: "Feb", orders: 46, rfqs: 62 },
  { label: "Mar", orders: 43, rfqs: 58 },
  { label: "Apr", orders: 57, rfqs: 78 },
  { label: "May", orders: 52, rfqs: 70 },
  { label: "Jun", orders: 68, rfqs: 88 },
  { label: "Jul", orders: 64, rfqs: 82 },
  { label: "Aug", orders: 76, rfqs: 96 },
  { label: "Sep", orders: 71, rfqs: 89 },
  { label: "Oct", orders: 83, rfqs: 103 },
  { label: "Nov", orders: 79, rfqs: 98 },
  { label: "Dec", orders: 91, rfqs: 112 },
]

const categoryPerformance = [
  { label: "Garments", value: 92 },
  { label: "Knitted fabric", value: 78 },
  { label: "Processing", value: 64 },
  { label: "Accessories", value: 48 },
  { label: "Job work", value: 39 },
]

const membershipMix = [
  { label: "Free", tone: "slate", value: 58 },
  { label: "Silver", tone: "blue", value: 22 },
  { label: "Gold", tone: "orange", value: 14 },
  { label: "Platinum", tone: "violet", value: 6 },
]

const directoryMenuCards = [
  ["Find Companies", "directory", "Search textile suppliers, exporters, factories, job-work units, machinery, logistics, and services."],
  ["Company Profiles", "profiles", "Review capacity, products, certificates, photos, location, WhatsApp, and buyer-ready trust signals."],
  ["Verified Suppliers", "verification", "Discover GST, IEC, factory, export, premium, and association-verified businesses."],
  ["Factory Capacity", "capacity", "Find available knitting, dyeing, printing, embroidery, washing, packing, and production capacity."],
  ["Textile Categories", "directory", "Browse yarn, fabric, garment, processing, accessories, services, and export categories."],
  ["Premium Members", "membership", "See businesses with stronger visibility, complete catalogs, verification, and lead access."],
]

const businessMenuItems = [
  ["Post a Requirement", "rfq", "Share product, quantity, target price, delivery date, compliance, and destination."],
  ["Textile Marketplace", "marketplace-store", "List fabric, yarn, accessories, stock lots, ready garments, machinery, and consumables."],
  ["Matched Supplier Leads", "rfq", "Route buyer opportunities to relevant suppliers by capability, location, and verification."],
  ["Requirement Broadcast", "broadcast", "Send matched lead alerts through mobile push, WhatsApp, and email."],
  ["Finance Marketplace", "finance", "Connect members with working capital, invoice discounting, export finance, and insurance partners."],
  ["CRM Lite", "crm-lite", "Manage leads, quotations, follow-ups, notes, tasks, and reminders."],
  ["Membership Plans", "membership", "Choose visibility, verification, catalog, and lead-access benefits."],
  ["Events and Jobs", "events", "Explore exhibitions, buyer-seller meets, training, vacancies, and applications."],
]

const networkMenuItems = [
  ["Association Hub", "associations", "Connect with TEAMA, TEA, NIFT-TEA, TAEF, buying offices, and ecosystem partners."],
  ["Business Networking", "networking", "Follow companies, post updates, discuss opportunities, and create introductions."],
  ["QR Business Profile", "qr-profile", "Share public profile URL, QR code, catalog, WhatsApp, and inquiry actions."],
  ["Member Momentum", "stats", "View growing membership, verified companies, buyer requirements, orders, and market reach."],
  ["Business Ecosystem", "marketplace", "Explore directory, RFQ, capacity, networking, events, jobs, and follow-up modules."],
  ["Mobile App", "mobile-app", "Use alerts, saved leads, chat actions, and WhatsApp integration on Android and iOS."],
  ["Multilingual Platform", "multilingual", "Support English, Tamil, and Hindi for wider adoption."],
  ["Regional Network", "expansion", "Follow expansion from Tirupur to Coimbatore, Erode, Karur, and Tamil Nadu."],
]

const insightMenuItems = [
  ["Industry Journal", "blog", "Read practical sourcing, capacity, compliance, export, and business-growth guidance."],
  ["Market Reports", "reports", "Track companies, RFQs, leads, contact reveals, categories, conversion, and revenue."],
  ["Export Intelligence", "export-intelligence", "Review country-wise trends, product demand, trade stats, currency updates, and export alerts."],
  ["AI Textile Assistant", "ai-assistant", "Ask industry questions and find suppliers, exporters, capacity, and export-term guidance."],
  ["Advertising Center", "advertising", "Sell homepage banners, category banners, featured companies, sponsored posts, and event sponsorships."],
  ["Verification Guide", "verification", "Understand supplier trust levels, evidence, audit trails, and renewals."],
  ["Industry Updates", "events", "Follow exhibitions, training, textile news, GST updates, schemes, and trade policy."],
]

const whyStorySlides: ImageStorySlide[] = [
  {
    badge: "Supplier search",
    body: "Buyers can search fabric, yarn, knitting, dyeing, printing, embroidery, accessories, and job-work suppliers with real business filters instead of random contact lists.",
    image: knittedFabricRollsImage,
    label: "Supplier search",
    tone: "blue",
    title: "Find the right Tirupur supplier before the first phone call.",
  },
  {
    badge: "Factory capacity",
    body: "Factory cards can show monthly capacity, machines, line strength, sample readiness, turnaround, MOQ, and verified production status for faster buyer decisions.",
    image: garmentFactoryImage,
    label: "Factory capacity",
    tone: "emerald",
    title: "Turn idle knitting, processing, and stitching capacity into visible business.",
  },
  {
    badge: "Product catalog",
    body: "Companies can publish knitted garments, fabric types, trims, certifications, sample photos, MOQ, GSM, composition, and export markets on a buyer-ready profile.",
    image: tshirtStackImage,
    label: "Product catalog",
    tone: "orange",
    title: "Show products, capabilities, and proof in one profile.",
  },
  {
    badge: "QR profile",
    body: "Every verified company can share a public QR profile on visiting cards, WhatsApp, catalogs, invoices, and trade fair stalls to capture inquiries directly.",
    image: sourcingMeetingImage,
    label: "QR business profile",
    tone: "violet",
    title: "Make every company profile easy to share, scan, and trust.",
  },
]

type PlatformBrand = {
  id: string
  mark: string
  name: string
  label: string
  logo?: string
  target?: string
}

const brandMarqueeLogos: PlatformBrand[] = [
  { id: "tirupur-connect", mark: "TC", name: "Tirupur Connect", label: "Network", logo: "/associations/tirupur-connect.svg", target: "#associations" },
  { id: "teama", mark: "TEAMA", name: "Exporters & Manufacturers", label: "Association", logo: "/associations/teama.png", target: "#associations" },
  { id: "tea", mark: "TEA", name: "Tiruppur Exporters", label: "Association", logo: "/associations/tea.png", target: "#associations" },
  { id: "nift-tea", mark: "NIFT", name: "NIFT-TEA", label: "Skills", logo: "/associations/nift-tea.png", target: "#associations" },
  { id: "taef", mark: "TAEF", name: "Tamil Nadu Entrepreneurs", label: "Federation", target: "#associations" },
  { id: "tirupur-textiles", mark: "TT", name: "The Tirupur Textiles", label: "Buying Office", logo: "/associations/tirupur-textiles.png", target: "#associations" },
  { id: "fabric-suppliers", mark: "FAB", name: "Fabric Suppliers", label: "Marketplace", target: "#directory" },
  { id: "knitting-units", mark: "KNT", name: "Knitting Units", label: "Capacity", target: "#directory" },
  { id: "dyeing-processing", mark: "DYE", name: "Dyeing & Processing", label: "Job Work", target: "#directory" },
  { id: "garment-manufacturers", mark: "GAR", name: "Garment Manufacturers", label: "Factory", target: "#directory" },
  { id: "labels-accessories", mark: "ACC", name: "Labels & Accessories", label: "Supply", target: "#directory" },
  { id: "logistics-providers", mark: "LOG", name: "Logistics Providers", label: "Export", target: "#directory" },
  { id: "codexsun", mark: "CX", name: "Codexsun", label: "Platform", target: "#associations" },
]

const companyProfiles = [
  {
    badges: ["GST", "Factory", "GOTS"],
    category: "Garment manufacturer / Exporter",
    certificate: "Export verified",
    contact: "WhatsApp ready",
    image: garmentFactoryImage,
    location: "Avinashi Road, Tirupur",
    metric: "18,000 pcs/day",
    name: "Aruna Knit Exports",
    verified: "Premium verified",
  },
  {
    badges: ["GST", "Capacity", "QC"],
    category: "Circular knitting unit",
    certificate: "Machine verified",
    contact: "4 hr response",
    image: knittingMachineImage,
    location: "Palladam Road",
    metric: "7,500 kg/month",
    name: "Sri Velan Knitters",
    verified: "Factory verified",
  },
  {
    badges: ["GST", "Lab dip", "Eco"],
    category: "Dyeing and processing",
    certificate: "Process verified",
    contact: "Sample support",
    image: dyeingUnitImage,
    location: "SIPCOT processing belt",
    metric: "12 ton/day",
    name: "Colorline Process House",
    verified: "GST verified",
  },
  {
    badges: ["FAB", "GSM", "Stock"],
    category: "Knitted fabric supplier",
    certificate: "Stock verified",
    contact: "Same-day quote",
    image: knittedFabricRollsImage,
    location: "Kangeyam Road",
    metric: "Cotton / PC / fleece",
    name: "Tirupur Fabric Hub",
    verified: "Basic verified",
  },
  {
    badges: ["EMB", "Design", "Job"],
    category: "Embroidery job-work unit",
    certificate: "Portfolio verified",
    contact: "Artwork support",
    image: embroideryMachineImage,
    location: "Anupparpalayam",
    metric: "24-head machines",
    name: "Nova Embroidery Works",
    verified: "Factory verified",
  },
  {
    badges: ["LBL", "ZIP", "PKG"],
    category: "Labels and accessories",
    certificate: "Supply verified",
    contact: "Stock dispatch",
    image: accessoriesImage,
    location: "Tirupur town",
    metric: "Labels, zips, trims",
    name: "Classic Trim Supply",
    verified: "GST verified",
  },
  {
    badges: ["IEC", "Buyer", "QC"],
    category: "Buying house and sourcing desk",
    certificate: "IEC verified",
    contact: "Buyer desk",
    image: sourcingMeetingImage,
    location: "Kumaran Road",
    metric: "EU / UK programs",
    name: "Global Knit Sourcing",
    verified: "Export verified",
  },
]

const platformStats = [
  { icon: Users, label: "Active members", note: "Buyers, suppliers, factories, and service partners", suffix: "+", tone: "blue", value: 2500 },
  { icon: Building2, label: "Verified companies", note: "GST, factory, export, and compliance-reviewed profiles", suffix: "+", tone: "emerald", value: 780 },
  { icon: FileCheck2, label: "Buyer requirements", note: "Garment, fabric, job-work, and sourcing RFQs received", suffix: "+", tone: "orange", value: 4200 },
  { icon: PackageCheck, label: "Orders connected", note: "Qualified buyer-supplier opportunities moved forward", suffix: "+", tone: "violet", value: 1850 },
  { icon: Globe2, label: "Buyer markets", note: "India, Europe, UK, Middle East, and global sourcing desks", suffix: "", tone: "blue", value: 24 },
]

const blogStories = [
  {
    category: "Buyer sourcing",
    date: "18 Jun 2026",
    image: sourcingMeetingImage,
    target: "rfq",
    title: "How a complete textile RFQ attracts faster, more accurate supplier quotes",
    body: "Quantity, GSM, composition, target price, delivery date, testing needs, and destination can turn a vague inquiry into an actionable order.",
  },
  {
    category: "Factory growth",
    date: "12 Jun 2026",
    image: garmentFactoryImage,
    target: "capacity",
    title: "Turn spare production capacity into a visible business opportunity",
    body: "Publish machine type, daily output, MOQ, sample readiness, and lead time so buyers can find the right Tirupur unit without repeated calls.",
  },
  {
    category: "Compliance",
    date: "05 Jun 2026",
    image: knittedFabricRollsImage,
    target: "verification",
    title: "What global buyers expect from a verified textile supplier profile",
    body: "SEDEX, ISO, sustainability, GST, IEC, factory evidence, and renewal tracking help serious manufacturers stand out before the first meeting.",
  },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  function go(target: string) {
    setMenuOpen(false)
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <main className="public-page">
      <PublicHeader menuOpen={menuOpen} onNavigate={go} onToggleMenu={() => setMenuOpen((value) => !value)} />

      <HeroSection onNavigate={go} />

      <LogoStripSection />

      <WhyStorySection />

      <DirectorySection />

      <ProfileSection />

      <StatsSection />

      <EcosystemSection />

      <MarketplaceCatalogSection />

      <RfqSection />

      <BroadcastSection />

      <CapacitySection />

      <NetworkingSection />

      <ManagedPublicSection
        defaults={{
          body: "A QR profile gives every supplier a public profile URL, product catalog, contact person, WhatsApp action, map, and inquiry path.",
          eyebrow: "Digital business card and QR profile",
          title: "Every company profile should be scan-ready at meetings, factories, and exhibitions",
          tone: "white",
        }}
        id="qr-profile"
        sectionKey="qr-profile-section"
      >
        {(section) => <QrProfileShowcase cards={section.cards.length ? section.cards : qrProfileCards} />}
      </ManagedPublicSection>

      <ManagedPublicSection
        defaults={{
          body: "Basic, GST, IEC, factory, export, premium, and association badges help buyers trust faster.",
          eyebrow: "Verified supplier program",
          title: "Trust badges should become a serious paid product",
          tone: "white",
        }}
        id="verification"
        sectionKey="verification-section"
      >
        <VerificationStack />
      </ManagedPublicSection>

      <ManagedPublicSection
        defaults={{
          body: "Members pay for better visibility, lead access, trust badges, premium placement, and time saved.",
          eyebrow: "Membership model",
          title: "Free listing first. Paid visibility after value is proven.",
          tone: "soft",
        }}
        id="membership"
        sectionKey="membership-section"
      >
        <LivePlans />
      </ManagedPublicSection>

      <ManagedPublicSection
        defaults={{
          body: "Association hubs can carry notices, events, member directories, polls, committees, and onboarding drives.",
          eyebrow: "Associations and sister concerns",
          title: "Build the network with institutions that already hold industry trust",
          tone: "blue",
        }}
        id="associations"
        sectionKey="associations-section"
      >
        <AssociationGrid />
      </ManagedPublicSection>

      <ManagedPublicSection
        defaults={{
          body: "Exhibitions, training, jobs, resumes, news, GST updates, schemes, and trade policy keep the network active.",
          eyebrow: "Events, Jobs, News",
          title: "Daily reasons to return keep subscribers active",
          tone: "white",
        }}
        id="events"
        sectionKey="events-section"
      >
        <LiveNewsEvents />
      </ManagedPublicSection>

      <PublicSection
        eyebrow="Textile business journal"
        id="blog"
        title="Practical ideas for suppliers, manufacturers, and global buyers"
        body="Short, useful guidance on sourcing, production capacity, compliance, exports, and turning stronger company profiles into qualified business."
        tone="soft"
      >
        <BlogGrid onNavigate={go} />
      </PublicSection>

      <ManagedPublicSection
        defaults={{
          body: "Track company growth, verified members, RFQs, leads, contact reveals, ad clicks, and revenue.",
          eyebrow: "Analytics and admin",
          title: "Admin pages need rollups, not repeated full-table calculations",
          tone: "white",
        }}
        id="reports"
        sectionKey="reports-section"
      >
        <AnalyticsBoard />
      </ManagedPublicSection>

      <ManagedCardSection defaults={{ body: "Country-wise export movement, product demand, global opportunities, currency updates, and trade alerts can turn Tirupur Connect into a decision tool.", eyebrow: "Export intelligence center", title: "Premium members need export signals, not only directory visibility", tone: "blue" }} fallbackCards={exportIntelligenceCards} id="export-intelligence" sectionKey="export-intelligence-section" />

      <ManagedCardSection defaults={{ body: "Working capital, invoice discounting, export finance, factoring, and insurance can be routed through trusted referral partnerships.", eyebrow: "Finance marketplace", title: "Connect factories and exporters with the right finance partners", tone: "white" }} fallbackCards={financeCards} id="finance" sectionKey="finance-section" />

      <ManagedPublicSection
        defaults={{
          body: "The assistant can help users find suppliers, explain export terms, discover available capacity, and navigate Tirupur's textile ecosystem.",
          eyebrow: "AI textile assistant",
          title: "Make industry search conversational for buyers and suppliers",
          tone: "soft",
        }}
        id="ai-assistant"
        sectionKey="ai-assistant-section"
      >
        <AiAssistantBoard />
      </ManagedPublicSection>

      <ManagedCardSection defaults={{ body: "Homepage banners, category banners, featured companies, sponsored posts, and event sponsorships give paid members stronger visibility.", eyebrow: "Advertising and promotion center", title: "Promotions become a recurring revenue layer on top of discovery", tone: "green" }} fallbackCards={advertisingCards} id="advertising" sectionKey="advertising-section" />

      <ManagedPublicSection
        defaults={{
          body: "Android and iOS support makes the marketplace practical for factory owners, merchandisers, suppliers, and field teams.",
          eyebrow: "Mobile application",
          title: "RFQs, leads, saved companies, and chat actions should travel with the user",
          tone: "white",
        }}
        id="mobile-app"
        sectionKey="mobile-app-section"
      >
        {(section) => <MobileAppShowcase cards={section.cards.length ? section.cards : mobileCards} />}
      </ManagedPublicSection>

      <ManagedCardSection defaults={{ body: "Leads, quotations, notes, tasks, reminders, and follow-up dates turn public discovery into repeatable sales motion.", eyebrow: "Textile CRM Lite", title: "Small textile businesses need simple lead discipline", tone: "soft" }} fallbackCards={crmLiteCards} id="crm-lite" sectionKey="crm-lite-section" />

      <ManagedCardSection defaults={{ body: "Exporters, factory owners, job-work units, buyers, service providers, and workers should all be able to understand and participate.", eyebrow: "Multilingual platform", title: "English, Tamil, and Hindi keep the platform usable across the full industry", tone: "white" }} fallbackCards={languageCards} id="multilingual" sectionKey="multilingual-section" />

      <ManagedPublicSection
        defaults={{
          body: "Use the same platform for Coimbatore, Erode, Karur, and future textile networks.",
          eyebrow: "Regional expansion",
          title: "Start with Tirupur. Expand to Tamil Nadu textile networks.",
          tone: "soft",
        }}
        id="expansion"
        sectionKey="expansion-section"
      >
        <ExpansionMap />
      </ManagedPublicSection>

      <CtaSection />
      <PublicFooter onNavigate={go} />
    </main>
  )
}

function PublicHeader({ menuOpen, onNavigate, onToggleMenu }: { menuOpen: boolean; onNavigate(target: string): void; onToggleMenu(): void }) {
  return (
    <header className="site-header">
      <DevBadge label="HEADER" />
      <div className="site-header-inner">
        <button className="brand" type="button" onClick={() => onNavigate("home")}>
          <TirupurConnectLogo className="brand-logo" variant="light" />
          <span>
            <strong>Tirupur Connect</strong>
            <small>{brandTagline}</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <button className="top-menu-link active" type="button" onClick={() => onNavigate("home")}>Home</button>

          <div className="mega-menu">
            <button className="top-menu-trigger" type="button">
              Directory
              <ChevronDown aria-hidden="true" className="menu-chevron" size={14} strokeWidth={2.4} />
            </button>
            <div className="mega-panel product-panel">
              <div className="mega-intro">
                <p>Supplier discovery</p>
                <h3>Find the right textile business faster</h3>
                <span>Search Tirupur companies by category, product, capability, verification, location, export readiness, and available capacity.</span>
                <button type="button" onClick={() => onNavigate("directory")}>Explore directory →</button>
              </div>
              <div className="mega-card-grid">
                {directoryMenuCards.map(([title, target, body]) => (
                  <MegaMenuCard body={body} key={title} onClick={() => onNavigate(target)} title={title} />
                ))}
              </div>
            </div>
          </div>

          <div className="mega-menu">
            <button className="top-menu-trigger" type="button">
              Business
              <ChevronDown aria-hidden="true" className="menu-chevron" size={14} strokeWidth={2.4} />
            </button>
            <SimpleMegaPanel eyebrow="Business opportunities" items={businessMenuItems} onNavigate={onNavigate} title="Source, quote, connect, and grow" />
          </div>

          <div className="mega-menu">
            <button className="top-menu-trigger" type="button">
              Network
              <ChevronDown aria-hidden="true" className="menu-chevron" size={14} strokeWidth={2.4} />
            </button>
            <SimpleMegaPanel eyebrow="Textile community" items={networkMenuItems} onNavigate={onNavigate} title="Associations, members, and regional growth" />
          </div>

          <div className="mega-menu">
            <button className="top-menu-trigger" type="button">
              Insights
              <ChevronDown aria-hidden="true" className="menu-chevron" size={14} strokeWidth={2.4} />
            </button>
            <SimpleMegaPanel eyebrow="Knowledge and intelligence" items={insightMenuItems} onNavigate={onNavigate} title="Learn from the Tirupur textile ecosystem" />
          </div>
        </nav>

        <div className="header-actions">
          <a className="ghost-button" href="/portal">Login</a>
          <a className="primary-button" href="/portal">Post RFQ</a>
          <ThemeToggle />
          <button className="menu-button" type="button" onClick={onToggleMenu}>{menuOpen ? "×" : "☰"}</button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="mobile-nav">
          <MobileMenuGroup items={[["Home", "home"]]} onNavigate={onNavigate} />
          <MobileMenuGroup title="Directory" items={directoryMenuCards.map(([label, target]) => [label, target])} onNavigate={onNavigate} />
          <MobileMenuGroup title="Business" items={businessMenuItems.map(([label, target]) => [label, target])} onNavigate={onNavigate} />
          <MobileMenuGroup title="Network" items={networkMenuItems.map(([label, target]) => [label, target])} onNavigate={onNavigate} />
          <MobileMenuGroup title="Insights" items={insightMenuItems.map(([label, target]) => [label, target])} onNavigate={onNavigate} />
          <a className="mobile-admin-link" href="/portal">Login</a>
        </nav>
      ) : null}
    </header>
  )
}

function MegaMenuCard({ body, onClick, title }: { body: string; onClick(): void; title: string }) {
  return (
    <button className="mega-card" onClick={onClick} type="button">
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  )
}

function SimpleMegaPanel({ eyebrow, items, onNavigate, title }: { eyebrow: string; items: string[][]; onNavigate(target: string): void; title: string }) {
  return (
    <div className="mega-panel simple-panel">
      <div className="simple-intro">
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      <div className="simple-menu-grid">
        {items.map(([label, target, body]) => (
          <button key={label} onClick={() => onNavigate(target)} type="button">
            <strong>{label}</strong>
            <span>{body}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MobileMenuGroup({ items, onNavigate, title }: { items: string[][]; onNavigate(target: string): void; title?: string }) {
  return (
    <div className="mobile-menu-group">
      {title ? <strong>{title}</strong> : null}
      {items.map(([label, target]) => (
        <button key={`${title ?? "root"}-${label}`} onClick={() => onNavigate(target)} type="button">{label}</button>
      ))}
    </div>
  )
}

function HeroSection({ onNavigate }: { onNavigate(target: string): void }) {
  const [slides, setSlides] = useState<HomeSliderSlide[]>(homeSliderSlides)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const slider = page.sections.find((section) => section.section_key === "home-slider")
        const databaseSlides = slider?.items.map(toHomeSliderSlide).filter((slide): slide is HomeSliderSlide => Boolean(slide)) ?? []
        if (databaseSlides.length) setSlides(databaseSlides)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSlider
      devLabel="HOME-SLIDER"
      id="home"
      onNavigate={onNavigate}
      options={{
        bulletPosition: "content",
        duration: 6500,
        progressPosition: "bottom-center",
        variant: "home-slider",
      }}
      renderLayer={(slide) => <HomeSliderTrustLayer slide={slide as HomeSliderSlide} />}
      slides={slides}
    />
  )
}

function toHomeSliderSlide(item: FrontendDesignerItem): HomeSliderSlide | null {
  if (!item.title || !item.image_url) return null
  const content = item.content ?? {}
  const card = objectValue(content.card)
  const rawInsights = Array.isArray(content.insights) ? content.insights : []
  const rawActions = Array.isArray(content.actions) ? content.actions : []
  return {
    id: item.item_key || item.uuid,
    eyebrow: item.eyebrow ?? "",
    title: item.title,
    body: item.body ?? "",
    image: item.image_url,
    imagePosition: stringValue(content.imagePosition, "center"),
    actions: rawActions.map((entry) => {
      const action = objectValue(entry)
      return {
        label: stringValue(action.label, "Open"),
        target: stringValue(action.target, item.target_url ?? "directory"),
        variant: action.variant === "ghost" ? "ghost" as const : "primary" as const,
      }
    }),
    card: {
      eyebrow: stringValue(card.eyebrow),
      title: stringValue(card.title),
      body: stringValue(card.body),
    },
    insights: rawInsights.map((entry) => {
      const insight = objectValue(entry)
      const tone = insight.tone
      return {
        icon: stringValue(insight.icon),
        label: stringValue(insight.label),
        value: stringValue(insight.value),
        tone: tone === "emerald" || tone === "orange" || tone === "violet" ? tone : "blue",
      }
    }),
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function stringArrayValue(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return items.length ? items : fallback
}

function loadFrontendHomePage() {
  frontendHomePageRequest ??= publicApi<FrontendDesignerPage>("/frontend-pages/home").catch((error) => {
    frontendHomePageRequest = null
    throw error
  })
  return frontendHomePageRequest
}

function HomeSliderTrustLayer({ slide }: { slide: HomeSliderSlide }) {
  return (
    <Reveal className="hero-panel" delay={120}>
      <div className="lead-card">
        <span>{slide.card.eyebrow}</span>
        <strong>{slide.card.title}</strong>
        <p>{slide.card.body}</p>
      </div>
      <div className="hero-stats">
        {slide.insights.map((item) => (
          <div className={`hero-stat hero-stat-${item.tone}`} key={item.label}>
            <span className="hero-stat-icon">{item.icon}</span>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </Reveal>
  )
}

function LogoStripSection() {
  const [brands, setBrands] = useState<PlatformBrand[]>(brandMarqueeLogos)
  const marqueeItems = [...brands, ...brands]

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const items = page.sections.find((section) => section.section_key === "platform-strip")?.items ?? []
        if (!items.length) return
        setBrands(items.map((item) => ({
          id: item.item_key,
          mark: item.eyebrow || String(item.content.mark ?? ""),
          name: item.title,
          label: item.summary || String(item.content.category ?? ""),
          logo: item.image_url || undefined,
          target: item.target_url || undefined,
        })))
      })
      .catch(() => undefined)
  }, [])

  return (
    <section className="logo-strip brand-marquee" aria-label="Associated brands and ecosystem partners">
      <DevBadge label="PLATFORM-STRIP" />
      <div className="brand-marquee-edge brand-marquee-edge-left" />
      <div className="brand-marquee-track">
        {marqueeItems.map((brand, index) => (
          <a className="brand-logo-card" href={brand.target || "#associations"} key={`${brand.id}-${index}`}>
            <span className={`brand-logo-mark ${brand.logo ? "has-image" : ""}`}>
              {brand.logo ? <img alt="" src={brand.logo} /> : brand.mark}
            </span>
            <span>
              <strong>{brand.name}</strong>
              <small>{brand.label}</small>
            </span>
          </a>
        ))}
      </div>
      <div className="brand-marquee-edge brand-marquee-edge-right" />
    </section>
  )
}

function WhyStorySection() {
  const [content, setContent] = useState<WhyStoryContent>(() => defaultWhyStoryContent())

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "why-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const slides = section.items.map((item) => {
          const itemContent = objectValue(item.content)
          const tone = stringValue(itemContent.tone, "blue")
          return {
            badge: item.eyebrow || String(itemContent.badge ?? item.summary ?? item.title),
            body: item.body || "",
            image: item.image_url || undefined,
            label: item.summary || String(itemContent.label ?? item.eyebrow ?? item.title),
            tone: isStoryTone(tone) ? tone : "blue",
            title: item.title,
          }
        })
        setContent({
          eyebrow: section.eyebrow || "Why Tirupur Connect",
          title: section.title || "Tirupur is strong, but business discovery is still fragmented",
          body: section.body || "One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions.",
          label: stringValue(settings.label, "Knitted fabric rolls to finished business"),
          headline: stringValue(settings.headline, "From Tirupur knitted fabric rolls to verified export-ready supplier profiles."),
          image: stringValue(settings.image, knittedFabricRollsImage),
          slides: slides.length ? slides : whyStorySlides,
        })
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="why" title={content.title} body={content.body} tone="white">
      <ImageStory
        image={content.image}
        items={content.slides.map((slide) => slide.badge)}
        label={content.label}
        slides={content.slides}
        title={content.headline}
      />
    </PublicSection>
  )
}

function defaultWhyStoryContent(): WhyStoryContent {
  return {
    eyebrow: "Why Tirupur Connect",
    title: "Tirupur is strong, but business discovery is still fragmented",
    body: "One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions.",
    label: "Knitted fabric rolls to finished business",
    headline: "From Tirupur knitted fabric rolls to verified export-ready supplier profiles.",
    image: knittedFabricRollsImage,
    slides: whyStorySlides,
  }
}

function isStoryTone(value: string): value is ImageStorySlide["tone"] {
  return ["blue", "emerald", "orange", "violet"].includes(value)
}

function DirectorySection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultDirectorySectionContent())

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "directory-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const tone = stringValue(settings.tone, "soft")
        setContent({
          eyebrow: section.eyebrow || "Business Directory",
          title: section.title || "Searchable textile categories built for Tirupur's value chain",
          body: section.body || "Find companies by real textile language: fabric, yarn, knitting, dyeing, printing, job work, exporters, accessories, logistics, and services.",
          tone: tone === "white" ? "white" : "soft",
        })
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="directory" title={content.title} body={content.body} tone={content.tone}>
      <LiveCategoryDirectory />
      <LiveCompanyDirectory />
    </PublicSection>
  )
}

function defaultDirectorySectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Business Directory",
    title: "Searchable textile categories built for Tirupur's value chain",
    body: "Find companies by real textile language: fabric, yarn, knitting, dyeing, printing, job work, exporters, accessories, logistics, and services.",
    tone: "soft",
  }
}

function ProfileSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultProfileSectionContent())

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "profile-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const tone = stringValue(settings.tone, "white")
        setContent({
          eyebrow: section.eyebrow || "Public company profile",
          title: section.title || "Every supplier profile should tell buyers what matters before the first call",
          body: section.body || "Each profile shows trust, capacity, products, certificates, photos, maps, contact actions, and quote flow.",
          tone: tone === "soft" ? "soft" : "white",
        })
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="profiles" title={content.title} body={content.body} tone={content.tone}>
      <CompanyProfileShowcase />
      <LiveProducts />
    </PublicSection>
  )
}

function defaultProfileSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Public company profile",
    title: "Every supplier profile should tell buyers what matters before the first call",
    body: "Each profile shows trust, capacity, products, certificates, photos, maps, contact actions, and quote flow.",
    tone: "white",
  }
}

function StatsSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultStatsSectionContent())

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "stats-section")
        if (!section) return
        const settings = objectValue(section.settings)
        setContent({
          eyebrow: section.eyebrow || "Network momentum",
          title: section.title || "A growing business network measured by useful outcomes",
          body: section.body || "Members, verified factories, buyer requirements, connected orders, and market reach show whether the platform is creating real business value.",
          tone: normalizeSectionTone(stringValue(settings.tone, "blue"), "blue"),
        })
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="stats" title={content.title} body={content.body} tone={content.tone}>
      <AnimatedStats />
    </PublicSection>
  )
}

function defaultStatsSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Network momentum",
    title: "A growing business network measured by useful outcomes",
    body: "Members, verified factories, buyer requirements, connected orders, and market reach show whether the platform is creating real business value.",
    tone: "blue",
  }
}

function normalizeSectionTone(value: string, fallback: SectionTone): SectionTone {
  return ["white", "soft", "ink", "blue", "green"].includes(value) ? value as SectionTone : fallback
}

function EcosystemSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultEcosystemSectionContent())
  const [cards, setCards] = useState(ecosystemCards)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "ecosystem-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const databaseCards = section.items
          .map((item) => ({ eyebrow: item.eyebrow || "", title: item.title, body: item.body || "" }))
          .filter((item) => item.eyebrow && item.title && item.body)
        setContent({
          eyebrow: section.eyebrow || "Core ecosystem modules",
          title: section.title || "More than a directory: a textile operating network",
          body: section.body || "Directory, profiles, verification, RFQs, capacity, networking, events, jobs, news, ads, analytics, and CRM-like follow-up.",
          tone: normalizeSectionTone(stringValue(settings.tone, "green"), "green"),
        })
        if (databaseCards.length) setCards(databaseCards)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="marketplace" title={content.title} body={content.body} tone={content.tone}>
      <CardGrid cards={cards} />
    </PublicSection>
  )
}

function defaultEcosystemSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Core ecosystem modules",
    title: "More than a directory: a textile operating network",
    body: "Directory, profiles, verification, RFQs, capacity, networking, events, jobs, news, ads, analytics, and CRM-like follow-up.",
    tone: "green",
  }
}

function MarketplaceCatalogSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultMarketplaceCatalogSectionContent())
  const [cards, setCards] = useState(marketplaceCatalogCards)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "marketplace-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const databaseCards = section.items
          .map((item) => ({ eyebrow: item.eyebrow || "", title: item.title, body: item.body || "" }))
          .filter((item) => item.eyebrow && item.title && item.body)
        setContent({
          eyebrow: section.eyebrow || "Textile marketplace",
          title: section.title || "A B2B catalog for fabric, yarn, accessories, stock lots, garments, and machinery",
          body: section.body || "Suppliers can list what they sell while buyers browse by real textile buying signals: quantity, category, MOQ, stock, sample readiness, and dispatch promise.",
          tone: normalizeSectionTone(stringValue(settings.tone, "white"), "white"),
        })
        if (databaseCards.length) setCards(databaseCards)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="marketplace-store" title={content.title} body={content.body} tone={content.tone}>
      <CardGrid cards={cards} />
    </PublicSection>
  )
}

function defaultMarketplaceCatalogSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Textile marketplace",
    title: "A B2B catalog for fabric, yarn, accessories, stock lots, garments, and machinery",
    body: "Suppliers can list what they sell while buyers browse by real textile buying signals: quantity, category, MOQ, stock, sample readiness, and dispatch promise.",
    tone: "white",
  }
}

function RfqSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultRfqSectionContent())
  const [steps, setSteps] = useState<RfqStep[]>(rfqSteps)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "rfq-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const databaseSteps = section.items
          .map((item) => {
            const content = objectValue(item.content)
            const tone = stringValue(content.tone, "blue")
            return {
              body: item.body || "",
              icon: rfqIcon(stringValue(content.icon, "send")),
              label: item.eyebrow || item.title,
              title: item.title,
              tone: isStoryTone(tone) ? tone : "blue",
            }
          })
          .filter((item) => item.label && item.title && item.body)
        setContent({
          eyebrow: section.eyebrow || "RFQ and business leads",
          title: section.title || "The revenue engine is buyer requirements and supplier response",
          body: section.body || "Buyers post requirements. Suppliers receive matched leads, quote faster, and unlock contact access by plan.",
          tone: normalizeSectionTone(stringValue(settings.tone, "white"), "white"),
        })
        if (databaseSteps.length) setSteps(databaseSteps)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="rfq" title={content.title} body={content.body} tone={content.tone}>
      <RfqFlow steps={steps} />
      <LiveRfqs />
    </PublicSection>
  )
}

function defaultRfqSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "RFQ and business leads",
    title: "The revenue engine is buyer requirements and supplier response",
    body: "Buyers post requirements. Suppliers receive matched leads, quote faster, and unlock contact access by plan.",
    tone: "white",
  }
}

function rfqIcon(value: string) {
  if (value === "scan-search") return ScanSearch
  if (value === "file-text") return FileText
  if (value === "handshake") return Handshake
  return Send
}

function BroadcastSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultBroadcastSectionContent())
  const [steps, setSteps] = useState<BroadcastStep[]>(broadcastSteps)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "broadcast-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const databaseSteps = section.items
          .map((item) => {
            const content = objectValue(item.content)
            const tone = stringValue(content.tone, "blue")
            return {
              body: item.body || "",
              icon: broadcastIcon(stringValue(content.icon, "send")),
              label: item.eyebrow || item.title,
              tone: isStoryTone(tone) ? tone : "blue",
            }
          })
          .filter((item) => item.label && item.body)
        setContent({
          eyebrow: section.eyebrow || "Buyer requirement broadcast",
          title: section.title || "Matched suppliers should hear about buyer requirements instantly",
          body: section.body || "A posted requirement becomes a routed alert through mobile push, WhatsApp, and email, then supplier responses are tracked for buyer comparison.",
          tone: normalizeSectionTone(stringValue(settings.tone, "soft"), "soft"),
        })
        if (databaseSteps.length) setSteps(databaseSteps)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="broadcast" title={content.title} body={content.body} tone={content.tone}>
      <BroadcastFlow steps={steps} />
    </PublicSection>
  )
}

function defaultBroadcastSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Buyer requirement broadcast",
    title: "Matched suppliers should hear about buyer requirements instantly",
    body: "A posted requirement becomes a routed alert through mobile push, WhatsApp, and email, then supplier responses are tracked for buyer comparison.",
    tone: "soft",
  }
}

function broadcastIcon(value: string) {
  if (value === "scan-search") return ScanSearch
  if (value === "bell-ring") return BellRing
  if (value === "handshake") return Handshake
  return Send
}

function CapacitySection() {
  const [content, setContent] = useState<CapacitySectionContent>(() => defaultCapacitySectionContent())

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "capacity-section")
        if (!section) return
        const settings = objectValue(section.settings)
        setContent({
          eyebrow: section.eyebrow || "Capacity exchange",
          title: section.title || "Idle capacity becomes a searchable business asset",
          body: section.body || "Factories can publish spare capacity, machine type, MOQ, lead time, and location.",
          tone: normalizeSectionTone(stringValue(settings.tone, "blue"), "blue"),
          image: stringValue(settings.image, spinningLineImage),
          items: stringArrayValue(settings.items, ["Available machines", "Lead time", "MOQ", "Location"]),
          label: stringValue(settings.label, "Factory utilization"),
          reverse: settings.reverse === true,
          storyTitle: stringValue(settings.storyTitle, "A live capacity board can help factories fill idle time and buyers find faster job-work slots."),
        })
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="capacity" title={content.title} body={content.body} tone={content.tone}>
      <ImageStory image={content.image} items={content.items} label={content.label} reverse={content.reverse} title={content.storyTitle} />
    </PublicSection>
  )
}

function defaultCapacitySectionContent(): CapacitySectionContent {
  return {
    eyebrow: "Capacity exchange",
    title: "Idle capacity becomes a searchable business asset",
    body: "Factories can publish spare capacity, machine type, MOQ, lead time, and location.",
    tone: "blue",
    image: spinningLineImage,
    items: ["Available machines", "Lead time", "MOQ", "Location"],
    label: "Factory utilization",
    reverse: true,
    storyTitle: "A live capacity board can help factories fill idle time and buyers find faster job-work slots.",
  }
}

function NetworkingSection() {
  const [content, setContent] = useState<DirectorySectionContent>(() => defaultNetworkingSectionContent())
  const [cards, setCards] = useState(networkingCards)

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === "networking-section")
        if (!section) return
        const settings = objectValue(section.settings)
        const databaseCards = section.items
          .map((item) => ({ eyebrow: item.eyebrow || "", title: item.title, body: item.body || "" }))
          .filter((item) => item.eyebrow && item.title && item.body)
        setContent({
          eyebrow: section.eyebrow || "Business networking",
          title: section.title || "Tirupur's textile industry needs its own professional network",
          body: section.body || "Companies, professionals, associations, service partners, and buying offices can build a trusted business graph around real trade activity.",
          tone: normalizeSectionTone(stringValue(settings.tone, "green"), "green"),
        })
        if (databaseCards.length) setCards(databaseCards)
      })
      .catch(() => undefined)
  }, [])

  return (
    <PublicSection eyebrow={content.eyebrow} id="networking" title={content.title} body={content.body} tone={content.tone}>
      <CardGrid cards={cards} />
    </PublicSection>
  )
}

function defaultNetworkingSectionContent(): DirectorySectionContent {
  return {
    eyebrow: "Business networking",
    title: "Tirupur's textile industry needs its own professional network",
    body: "Companies, professionals, associations, service partners, and buying offices can build a trusted business graph around real trade activity.",
    tone: "green",
  }
}

function ManagedPublicSection({
  children,
  defaults,
  id,
  sectionKey,
}: {
  children: ReactNode | ((section: DirectorySectionContent & { cards: SimplePublicCard[] }) => ReactNode)
  defaults: DirectorySectionContent
  id: string
  sectionKey: string
}) {
  const [content, setContent] = useState<DirectorySectionContent>(defaults)
  const [cards, setCards] = useState<SimplePublicCard[]>([])

  useEffect(() => {
    loadFrontendHomePage()
      .then((page) => {
        const section = page.sections.find((item) => item.section_key === sectionKey)
        if (!section) return
        const settings = objectValue(section.settings)
        setContent({
          eyebrow: section.eyebrow || defaults.eyebrow,
          title: section.title || defaults.title,
          body: section.body || defaults.body,
          tone: normalizeSectionTone(stringValue(settings.tone, defaults.tone), defaults.tone),
        })
        const databaseCards = section.items
          .map((item) => ({ eyebrow: item.eyebrow || "", title: item.title, body: item.body || "" }))
          .filter((item) => item.eyebrow && item.title && item.body)
        if (databaseCards.length) setCards(databaseCards)
      })
      .catch(() => undefined)
  }, [sectionKey])

  const childContent = typeof children === "function" ? children({ ...content, cards }) : children
  return (
    <PublicSection eyebrow={content.eyebrow} id={id} title={content.title} body={content.body} tone={content.tone}>
      {childContent}
    </PublicSection>
  )
}

function ManagedCardSection({ defaults, fallbackCards, id, sectionKey }: { defaults: DirectorySectionContent; fallbackCards: SimplePublicCard[]; id: string; sectionKey: string }) {
  return (
    <ManagedPublicSection defaults={defaults} id={id} sectionKey={sectionKey}>
      {(section) => <CardGrid cards={section.cards.length ? section.cards : fallbackCards} />}
    </ManagedPublicSection>
  )
}

function CompanyProfileShowcase() {
  const [activeCompany, setActiveCompany] = useState(0)
  const company = companyProfiles[activeCompany]
  const companyInitials = company.name.split(" ").map((word) => word[0]).slice(0, 2).join("")

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCompany((current) => {
        if (companyProfiles.length <= 1) return current
        let next = Math.floor(Math.random() * companyProfiles.length)
        if (next === current) next = (next + 1) % companyProfiles.length
        return next
      })
    }, 5200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Reveal className="company-showcase" delay={80}>
      <article className="company-profile-card company-profile-single" key={company.name}>
        <div className="company-profile-cover">
          <img alt={`${company.name} ${company.category}`} loading="lazy" src={company.image} />
          <span>{company.metric}</span>
        </div>
        <div className="company-profile-body">
          <div className="company-profile-header">
            <span className="profile-logo">{companyInitials}</span>
            <div>
              <p>{company.category}</p>
              <h3>{company.name}</h3>
              <small>{company.location}</small>
            </div>
          </div>
          <div className="company-profile-detail">
            <p>Verified profile preview for buyers to inspect capacity, certificates, product category, response quality, and trusted contact actions before starting a conversation.</p>
          </div>
          <div className="company-badges">
            {company.badges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
          <div className="company-certificates" aria-label="Company certifications">
            <span className="certificate-sedex">
              <BadgeCheck aria-hidden="true" size={18} strokeWidth={2.2} />
              <strong>SEDEX</strong>
              <small>Ethical audited</small>
            </span>
            <span className="certificate-iso">
              <Award aria-hidden="true" size={18} strokeWidth={2.2} />
              <strong>ISO</strong>
              <small>Quality certified</small>
            </span>
            <span className="certificate-green">
              <Leaf aria-hidden="true" size={18} strokeWidth={2.2} />
              <strong>Green</strong>
              <small>Compliant unit</small>
            </span>
          </div>
          <div className="company-profile-footer">
            <span>
              <BadgeCheck aria-hidden="true" size={17} />
              {company.certificate}
            </span>
            <span>
              <MessageCircle aria-hidden="true" size={17} />
              {company.contact}
            </span>
            <span className="factory-status">
              <Factory aria-hidden="true" size={17} />
              Factory verified
            </span>
            <strong>
              <ShieldCheck aria-hidden="true" size={18} />
              {company.verified}
            </strong>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

function AnimatedStats() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [started, setStarted] = useState(false)
  const [values, setValues] = useState(() => platformStats.map(() => 0))

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setStarted(true)
      observer.disconnect()
    }, { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValues(platformStats.map((stat) => stat.value))
      return
    }

    const duration = 1700
    const start = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValues(platformStats.map((stat) => Math.round(stat.value * eased)))
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [started])

  return (
    <div className="stats-grid" ref={sectionRef}>
      {platformStats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <article className={`stat-card stat-card-${stat.tone}`} key={stat.label}>
            <span className="stat-icon"><Icon aria-hidden="true" size={23} strokeWidth={2.1} /></span>
            <strong>{values[index].toLocaleString("en-IN")}{stat.suffix}</strong>
            <h3>{stat.label}</h3>
            <p>{stat.note}</p>
          </article>
        )
      })}
    </div>
  )
}

function RfqFlow({ steps }: { steps: RfqStep[] }) {
  return (
    <div className="rfq-card-grid">
      {steps.map((step, index) => {
        const Icon = step.icon
        return (
          <Reveal className={`rfq-card rfq-card-${step.tone}`} delay={index * 70} key={step.title}>
            <div className="rfq-card-brand">
              <span className="rfq-card-logo">
                <Icon aria-hidden="true" size={25} strokeWidth={2.15} />
              </span>
              <span>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{step.label}</strong>
              </span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </Reveal>
        )
      })}
    </div>
  )
}

function BroadcastFlow({ steps }: { steps: BroadcastStep[] }) {
  return (
    <div className="broadcast-flow">
      {steps.map((step, index) => {
        const Icon = step.icon
        return (
          <Reveal className={`broadcast-step broadcast-step-${step.tone}`} delay={index * 65} key={step.label}>
            <span className="broadcast-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="broadcast-icon"><Icon aria-hidden="true" size={24} strokeWidth={2.25} /></span>
            <h3>{step.label}</h3>
            <p>{step.body}</p>
          </Reveal>
        )
      })}
    </div>
  )
}

function QrProfileShowcase({ cards }: { cards: SimplePublicCard[] }) {
  return (
    <Reveal className="qr-profile-showcase" delay={80}>
      <div className="qr-profile-card">
        <span className="qr-profile-logo"><QrCode aria-hidden="true" size={44} strokeWidth={2.1} /></span>
        <small>tirupurconnect.com/aruna-knit-exports</small>
        <h3>Aruna Knit Exports</h3>
        <p>Premium verified garment manufacturer with product catalog, certificates, capacity, contact person, WhatsApp, and inquiry action.</p>
        <div>
          <span>Catalog</span>
          <span>WhatsApp</span>
          <span>Map</span>
          <span>Inquiry</span>
        </div>
      </div>
      <div className="qr-profile-points">
        {cards.map((card, index) => (
          <article key={card.title}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </Reveal>
  )
}

function AiAssistantBoard() {
  return (
    <Reveal className="ai-assistant-board" delay={80}>
      <div className="ai-assistant-panel">
        <span><Bot aria-hidden="true" size={28} strokeWidth={2.1} /></span>
        <h3>Ask Tirupur Connect</h3>
        <p>Search the directory, explain trade terms, find capacity, and guide buyers toward relevant supplier categories.</p>
      </div>
      <div className="ai-prompt-grid">
        {aiAssistantPrompts.map((prompt) => (
          <button key={prompt} type="button">
            <MessageCircle aria-hidden="true" size={18} strokeWidth={2.2} />
            {prompt}
          </button>
        ))}
      </div>
    </Reveal>
  )
}

function MobileAppShowcase({ cards }: { cards: SimplePublicCard[] }) {
  return (
    <Reveal className="mobile-app-showcase" delay={80}>
      <div className="mobile-phone-frame">
        <span><Smartphone aria-hidden="true" size={32} strokeWidth={2.1} /></span>
        <h3>Lead alert</h3>
        <p>Kidswear buyer needs 8,000 pcs. Matched to your category and capacity.</p>
        <button type="button">Open RFQ</button>
      </div>
      <div className="mobile-feature-grid">
        {cards.map((card) => (
          <article key={card.title}>
            <small>{card.eyebrow}</small>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </Reveal>
  )
}

function BlogGrid({ onNavigate }: { onNavigate(target: string): void }) {
  const [articles, setArticles] = useState<ContentRow[]>([])

  useEffect(() => {
    publicApi<{ records: ContentRow[] }>("/articles?limit=6&surface=home")
      .then((result) => setArticles(result.records))
      .catch(() => undefined)
  }, [])

  if (articles.length) {
    return (
      <div className="blog-grid">
        {articles.map((story, index) => (
          <Reveal className="blog-card" delay={index * 70} key={story.uuid}>
            <figure>
              <img alt={story.title} loading="lazy" src={story.image_url || sourcingMeetingImage} />
            </figure>
            <div className="blog-card-body">
              <div className="blog-meta">
                <span>{story.category || "Industry journal"}</span>
                <time>{formatDate(story.published_at || story.updated_at)}</time>
              </div>
              <h3>{story.title}</h3>
              <p>{story.summary || story.body || "Published Tirupur Connect marketplace update."}</p>
              <a className="blog-read-link" href={`/blog/${story.slug}`}>
                Read article
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2.3} />
              </a>
            </div>
          </Reveal>
        ))}
      </div>
    )
  }

  return (
    <div className="blog-grid">
      {blogStories.map((story, index) => (
        <Reveal className="blog-card" delay={index * 70} key={story.title}>
          <figure>
            <img alt={story.title} loading="lazy" src={story.image} />
          </figure>
          <div className="blog-card-body">
            <div className="blog-meta">
              <span>{story.category}</span>
              <time>{story.date}</time>
            </div>
            <h3>{story.title}</h3>
            <p>{story.body}</p>
            <button onClick={() => onNavigate(story.target)} type="button">
              Read topic
              <ArrowRight aria-hidden="true" size={17} strokeWidth={2.3} />
            </button>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function BlogIndexPage() {
  const [articles, setArticles] = useState<ContentRow[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; slug: string; uuid: string }>>([])
  const [tags, setTags] = useState<Array<{ name: string; slug: string; uuid: string }>>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const go = (target: string) => { window.location.href = `/#${target}` }

  function load() {
    setLoading(true)
    publicApi<{ records: ContentRow[] }>(`/articles?limit=24${search ? `&search=${encodeURIComponent(search)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`)
      .then((result) => setArticles(result.records))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [category])

  useEffect(() => {
    Promise.all([
      publicApi<{ records: Array<{ name: string; slug: string; uuid: string }> }>("/blog/categories"),
      publicApi<{ records: Array<{ name: string; slug: string; uuid: string }> }>("/blog/tags"),
    ]).then(([categoryRows, tagRows]) => {
      setCategories(categoryRows.records)
      setTags(tagRows.records)
    }).catch(() => undefined)
  }, [])

  return (
    <main className="public-page">
      <PublicHeader menuOpen={menuOpen} onNavigate={go} onToggleMenu={() => setMenuOpen((value) => !value)} />
      <section className="blog-page-hero">
        <Reveal>
          <p className="eyebrow">Textile business journal</p>
          <h1>Blog, guides, news, export updates, and marketplace learning</h1>
          <p>Published from the Tirupur Connect admin desk and focused on supplier discovery, RFQs, capacity, compliance, exports, and growth.</p>
        </Reveal>
      </section>
      <section className="blog-page-list blog-layout">
        <div className="blog-main-column">
          {loading ? <div className="live-empty"><p>Loading published articles...</p></div> : null}
          {!loading && !articles.length ? <FallbackBlogList /> : null}
          {articles.length ? <BlogCardList articles={articles} /> : null}
        </div>
        <aside className="blog-filter-panel">
          <h3>Find articles</h3>
          <div className="blog-search-box">
            <input onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") load() }} placeholder="Search blog" value={search} />
            <button onClick={load} type="button">Search</button>
          </div>
          <h3>Categories</h3>
          <button className={!category ? "active" : ""} onClick={() => setCategory("")} type="button">All articles</button>
          {categories.map((item) => <button className={category === item.slug ? "active" : ""} key={item.uuid} onClick={() => setCategory(item.slug)} type="button">{item.name}</button>)}
          <h3>Tags</h3>
          <div className="blog-tag-cloud">{tags.map((tag) => <span key={tag.uuid}>{tag.name}</span>)}</div>
        </aside>
      </section>
      <PublicFooter onNavigate={go} />
    </main>
  )
}

function BlogCardList({ articles }: { articles: ContentRow[] }) {
  return (
    <div className="blog-grid blog-grid-list">
      {articles.map((article, index) => (
        <Reveal className="blog-card" delay={index * 45} key={article.uuid}>
          <figure><img alt={article.title} loading="lazy" src={article.image_url || sourcingMeetingImage} /></figure>
          <div className="blog-card-body">
            <div className="blog-meta"><span>{article.category || "Industry journal"}</span><time>{formatDate(article.published_at || article.updated_at)}</time></div>
            <h3>{article.title}</h3>
            <p>{article.excerpt || article.summary || stripHtml(article.body || "") || "Published marketplace update."}</p>
            {article.tags?.length ? <div className="blog-card-tags">{article.tags.map((tag) => <span key={tag.uuid}>{tag.name}</span>)}</div> : null}
            <a className="blog-read-link" href={`/blog/${article.slug}`}>Read article <ArrowRight aria-hidden="true" size={17} strokeWidth={2.3} /></a>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function BlogDetailPage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<ContentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const go = (target: string) => { window.location.href = `/#${target}` }

  useEffect(() => {
    publicApi<ContentRow>(`/articles/${encodeURIComponent(slug)}`)
      .then(setArticle)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main className="public-page">
        <PublicHeader menuOpen={menuOpen} onNavigate={go} onToggleMenu={() => setMenuOpen((value) => !value)} />
        <section className="blog-page-hero"><p>Loading article...</p></section>
      </main>
    )
  }

  if (!article) {
    return (
      <main className="public-page">
        <PublicHeader menuOpen={menuOpen} onNavigate={go} onToggleMenu={() => setMenuOpen((value) => !value)} />
        <section className="blog-page-hero"><p className="eyebrow">Article not found</p><h1>This blog article is not published yet.</h1><p><a className="primary-button" href="/blog">Back to blog</a></p></section>
      </main>
    )
  }

  return (
    <main className="public-page">
      <PublicHeader menuOpen={menuOpen} onNavigate={go} onToggleMenu={() => setMenuOpen((value) => !value)} />
      <article className="blog-detail">
        <header>
          <p className="eyebrow">{article.category || "Industry journal"}</p>
          <h1>{article.title}</h1>
          <p>{article.summary || "Tirupur Connect marketplace article."}</p>
          <time>{formatDate(article.published_at || article.updated_at)}</time>
        </header>
        <figure><img alt={article.title} src={article.image_url || sourcingMeetingImage} /></figure>
        <div className="blog-detail-body" dangerouslySetInnerHTML={{ __html: article.body || article.summary || "<p>Article content is being prepared.</p>" }} />
      </article>
      <section className="blog-detail-extra">
        <div>
          <h2>Comments</h2>
          <CommentList article={article} comments={article.comments ?? []} />
          {article.allow_comments !== 0 ? <CommentForm articleUuid={article.uuid} /> : <p>Comments are closed for this article.</p>}
        </div>
        <aside>
          <h2>Related articles</h2>
          {article.related?.length ? <BlogCardList articles={article.related} /> : <p>Related articles will appear here as the journal grows.</p>}
        </aside>
      </section>
      <PublicFooter onNavigate={go} />
    </main>
  )
}

function CommentList({ article, comments }: { article: ContentRow; comments: BlogComment[] }) {
  if (!comments.length) return <p>No approved comments yet.</p>
  return (
    <div className="public-comment-list">
      {comments.map((comment) => (
        <article key={comment.uuid}>
          <strong>{comment.author_name}</strong>
          <time>{formatDate(comment.created_at)}</time>
          <p>{comment.body}</p>
          <details>
            <summary>Reply</summary>
            <CommentForm articleUuid={article.uuid} parentUuid={comment.uuid} />
          </details>
          {comment.replies?.length ? <div className="public-comment-replies"><CommentList article={article} comments={comment.replies} /></div> : null}
        </article>
      ))}
    </div>
  )
}

function CommentForm({ articleUuid, parentUuid }: { articleUuid: string; parentUuid?: string }) {
  const [sent, setSent] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    await publicApi("/blog/comments", { method: "POST", body: JSON.stringify({ ...data, articleUuid, parentUuid }) })
    setSent(true)
    event.currentTarget.reset()
  }
  if (sent) return <p className="comment-sent">Comment received. It will appear after review.</p>
  return (
    <form className="public-comment-form" onSubmit={submit}>
      <input name="authorName" placeholder="Name" required />
      <input name="authorEmail" placeholder="Email" type="email" />
      <textarea name="body" placeholder="Write your comment" required rows={4} />
      <button type="submit">Submit comment</button>
    </form>
  )
}

function FallbackBlogList() {
  return <div className="blog-grid">{blogStories.map((story) => <article className="blog-card" key={story.title}><figure><img alt={story.title} src={story.image} /></figure><div className="blog-card-body"><div className="blog-meta"><span>{story.category}</span><time>{story.date}</time></div><h3>{story.title}</h3><p>{story.body}</p><a className="blog-read-link" href={`/#${story.target}`}>Read topic <ArrowRight aria-hidden="true" size={17} strokeWidth={2.3} /></a></div></article>)}</div>
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function VerificationStack() {
  const verificationItems = [
    { body: "Identity and business details reviewed before the profile enters trusted search.", label: "Basic Verified", tone: "blue" },
    { body: "GST registration checked with renewal and profile-change tracking.", label: "GST Verified", tone: "emerald" },
    { body: "Importer Exporter Code reviewed for export-ready supplier discovery.", label: "IEC Verified", tone: "orange" },
    { body: "Factory evidence, capacity, machinery, and location reviewed.", label: "Factory Verified", tone: "violet" },
    { body: "Export markets, buyer programs, and compliance readiness assessed.", label: "Export Verified", tone: "cyan" },
    { body: "Priority trust layer with stronger visibility and renewal monitoring.", label: "Premium Verified", tone: "gold" },
    { body: "Association membership or ecosystem relationship supported by proof.", label: "Association Proof", tone: "rose" },
  ]

  return (
    <Reveal className="verification-showcase" delay={80}>
      <figure className="verification-image">
        <img alt="Tirupur garment factory verification and quality review" loading="lazy" src={garmentFactoryImage} />
        <figcaption>
          <ShieldCheck aria-hidden="true" size={24} strokeWidth={2.2} />
          <span>
            <strong>Factory trust review</strong>
            <small>Documents, capacity, compliance, and audit trail</small>
          </span>
        </figcaption>
      </figure>
      <div className="verification-stack">
        {verificationItems.map((item, index) => (
          <article className={`verification-card verification-card-${item.tone}`} key={item.label}>
            <span className="verification-badge">
              <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.3} />
              <b>{index + 1}</b>
            </span>
            <strong>{item.label}</strong>
            <small>{item.body}</small>
          </article>
        ))}
      </div>
    </Reveal>
  )
}

function AssociationGrid() {
  return (
    <div className="association-grid">
      {associations.map((association, index) => (
        <Reveal className={`association-card association-card-${association.tone}`} delay={index * 45} key={association.name}>
          <div className="association-card-brand">
            <div className="association-logo">
              {"logo" in association ? (
                <img alt={association.logoAlt} src={association.logo} />
              ) : (
                <strong aria-label={`${association.name} identity mark`}>{association.mark}</strong>
              )}
            </div>
            <span>{association.name}</span>
          </div>
          <h3>{association.fullName}</h3>
          <p>{association.body}</p>
          <a className="association-link" href={association.href}>
            Know more
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.4} />
          </a>
        </Reveal>
      ))}
    </div>
  )
}

function AnalyticsBoard() {
  return (
    <div className="report-dashboard">
      <Reveal className="report-kpis" delay={50}>
        {reportKpis.map((item) => {
          const Icon = item.icon
          return (
            <article className={`report-kpi report-kpi-${item.tone}`} key={item.label}>
              <div className="report-kpi-copy">
                <span><Icon aria-hidden="true" size={23} strokeWidth={2.2} /></span>
                <div>
                  <strong>{item.value}</strong>
                  <h3>{item.label}</h3>
                  <small>{item.note}</small>
                </div>
              </div>
              <div className="kpi-chart-panel">
                <div><span>{item.trendLabel}</span><strong>{item.change}</strong></div>
                <svg aria-hidden="true" className="kpi-sparkline" viewBox="0 0 206 92">
                  <line x1="8" x2="198" y1="28" y2="28" />
                  <line x1="8" x2="198" y1="54" y2="54" />
                  <line x1="8" x2="198" y1="80" y2="80" />
                  <polyline className="kpi-compare-line" points={item.compare} />
                  <polyline className="kpi-main-line" points={item.trend} />
                  <circle className="kpi-end-dot" cx="194" cy={Number(item.trend.split(" ").at(-1)?.split(",")[1] ?? 10)} r="4" />
                </svg>
              </div>
            </article>
          )
        })}
      </Reveal>

      <div className="report-chart-grid">
        <Reveal className="report-chart report-chart-wide" delay={90}>
          <div className="report-chart-head">
            <div><small>Monthly movement</small><h3>RFQs and connected orders</h3></div>
            <div className="chart-legend"><span className="legend-rfq">RFQs</span><span className="legend-order">Orders</span></div>
          </div>
          <div className="line-chart-wrap">
            <svg aria-label="Monthly RFQ and connected order bar chart" className="line-chart-svg" role="img" viewBox="0 0 760 360">
              <g className="line-grid">
                {[45, 105, 165, 225, 285].map((y) => <line key={y} x1="48" x2="736" y1={y} y2={y} />)}
              </g>
              <g className="line-y-labels">
                <text x="10" y="50">120</text>
                <text x="18" y="110">90</text>
                <text x="18" y="170">60</text>
                <text x="18" y="230">30</text>
                <text x="25" y="290">0</text>
              </g>
              {monthlyMovement.map((month, index) => {
                const x = 58 + index * (668 / (monthlyMovement.length - 1))
                const rfqY = 285 - (month.rfqs / 120) * 240
                const orderY = 285 - (month.orders / 120) * 240
                const rfqHeight = 285 - rfqY
                const orderHeight = 285 - orderY
                return (
                  <g key={month.label}>
                    <rect className="monthly-bar monthly-bar-rfq" height={rfqHeight} rx="3" width="17" x={x - 19} y={rfqY} />
                    <rect className="monthly-bar monthly-bar-order" height={orderHeight} rx="3" width="17" x={x + 2} y={orderY} />
                    <text className="line-x-label" textAnchor="middle" x={x} y="328">{month.label}</text>
                    <title>{`${month.label}: ${month.rfqs} RFQs, ${month.orders} orders`}</title>
                  </g>
                )
              })}
            </svg>
          </div>
        </Reveal>

        <Reveal className="report-chart" delay={130}>
          <div className="report-chart-head"><div><small>Demand</small><h3>Top categories</h3></div><BarChart3 aria-hidden="true" size={22} /></div>
          <div className="category-chart">
            {categoryPerformance.map((item) => (
              <div key={item.label}>
                <span><b>{item.label}</b><small>{item.value}%</small></span>
                <i><em style={{ width: `${item.value}%` }} /></i>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="report-chart membership-chart" delay={170}>
          <div className="report-chart-head"><div><small>Subscriptions</small><h3>Membership mix</h3></div><strong>42% paid</strong></div>
          <div className="membership-donut-layout">
            <div className="membership-donut">
              <svg aria-label="Membership plan distribution" role="img" viewBox="0 0 120 120">
                <circle className="donut-track" cx="60" cy="60" pathLength="100" r="44" />
                {membershipMix.map((item, index) => {
                  const preceding = membershipMix.slice(0, index).reduce((sum, entry) => sum + entry.value, 0)
                  return (
                    <circle
                      className={`donut-segment donut-${item.tone}`}
                      cx="60"
                      cy="60"
                      key={item.label}
                      pathLength="100"
                      r="44"
                      strokeDasharray={`${item.value} ${100 - item.value}`}
                      strokeDashoffset={-preceding}
                    >
                      <title>{`${item.label}: ${item.value}%`}</title>
                    </circle>
                  )
                })}
              </svg>
              <span><strong>42%</strong><small>Paid</small></span>
            </div>
            <div className="membership-legend">
              {membershipMix.map((item) => <span className={`membership-key-${item.tone}`} key={item.label}><b>{item.value}%</b>{item.label}</span>)}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

function ExpansionMap() {
  return (
    <Reveal className="expansion-map" delay={80}>
      {["Tirupur Connect", "Coimbatore Connect", "Erode Connect", "Karur Connect", "Tamil Nadu Textile Business Network"].map((item) => (
        <div key={item}>
          <strong>{item}</strong>
          <span>{item === "Tirupur Connect" ? "Phase 1" : "Future rollout"}</span>
        </div>
      ))}
    </Reveal>
  )
}

function CtaSection() {
  return (
    <section className="cta-section" id="contact">
      <DevBadge label="CONTACT-CTA" />
      <Reveal>
        <p className="eyebrow">Build the network carefully</p>
        <h2>Public page first. Reusable blocks now. Backend modules after the story is clear.</h2>
        <p>These sections are intentionally small and reusable across future product apps. Only the content needs to change for ecommerce, sports, learning, welfare, textile lab, or any other public surface.</p>
        <div className="hero-actions centered">
          <a className="primary-button" href="/portal">Join Tirupur Connect</a>
          <a className="ghost-button" href="mailto:hello@tirupurconnect.com">Partner with us</a>
        </div>
      </Reveal>
    </section>
  )
}

function PublicFooter({ onNavigate }: { onNavigate(target: string): void }) {
  const columns: Array<{ title: string; items: Array<{ label: string; target: string; href?: string }> }> = [
    {
      title: "Marketplace",
      items: [
        { label: "Directory", target: "directory" },
        { label: "Company profiles", target: "profiles" },
        { label: "Products", target: "marketplace-store" },
        { label: "RFQs", target: "rfq" },
        { label: "Capacity exchange", target: "capacity" },
      ],
    },
    {
      title: "Revenue",
      items: [
        { label: "Memberships", target: "membership" },
        { label: "Lead credits", target: "rfq" },
        { label: "Verification", target: "verification" },
        { label: "Advertisements", target: "advertising" },
        { label: "Finance", target: "finance" },
      ],
    },
    {
      title: "Community",
      items: [
        { label: "Associations", target: "associations" },
        { label: "Events", target: "events" },
        { label: "Jobs", target: "events" },
        { label: "News", target: "blog", href: "/blog" },
        { label: "Blog", target: "blog", href: "/blog" },
      ],
    },
    {
      title: "Tools",
      items: [
        { label: "Export intelligence", target: "export-intelligence" },
        { label: "AI assistant", target: "ai-assistant" },
        { label: "Mobile app", target: "mobile-app" },
        { label: "CRM Lite", target: "crm-lite" },
        { label: "Multilingual", target: "multilingual" },
      ],
    },
  ]

  return (
    <footer className="site-footer">
      <DevBadge label="FOOTER" />
      <div>
        <button className="brand footer-brand" type="button" onClick={() => onNavigate("home")}>
          <TirupurConnectLogo className="brand-logo" variant="dark" />
          <span>
            <strong>Tirupur Connect</strong>
            <small>{brandTagline}</small>
          </span>
        </button>
        <p>{brandTagline} across Tirupur Connect and future Tamil Nadu textile business networks.</p>
      </div>
      {columns.map(({ items, title }) => (
        <div className="footer-column" key={title}>
          <strong>{title}</strong>
          {items.map((item) => item.href
            ? <a href={item.href} key={item.label}>{item.label}</a>
            : <button key={item.label} onClick={() => onNavigate(item.target)} type="button">{item.label}</button>)}
        </div>
      ))}
    </footer>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Published"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      {window.location.pathname.startsWith("/portal")
        ? <MarketplacePortal />
        : window.location.pathname === "/blog"
          ? <BlogIndexPage />
          : window.location.pathname.startsWith("/blog/")
            ? <BlogDetailPage slug={decodeURIComponent(window.location.pathname.replace(/^\/blog\//, "").replace(/\/$/, ""))} />
            : <App />}
      <TirupurConnectGlobalLoader />
    </ThemeProvider>
  </StrictMode>,
)
