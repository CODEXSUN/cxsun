import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { ArrowRight, ArrowUpRight, Award, BadgeCheck, BarChart3, Building2, ChevronDown, Factory, FileCheck2, FileText, Globe2, Handshake, IndianRupee, Leaf, MessageCircle, PackageCheck, ScanSearch, Send, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { PublicSlider, type PublicSliderSlide } from "./PublicSlider"
import { CardGrid, CategoryCloud, DevBadge, ImageStory, PublicSection, Reveal, type CategoryCard, type ImageStorySlide } from "./public-sections"
import { TirupurConnectLogo } from "./TirupurConnectLogo"
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

const categories: CategoryCard[] = [
  { body: "GSM, blends, stock lots", icon: "FAB", title: "Fabric Suppliers", tone: "blue" },
  { body: "Cotton, blends, counts", icon: "YRN", title: "Yarn Suppliers", tone: "emerald" },
  { body: "Gauge and kg capacity", icon: "KNT", title: "Knitting Units", tone: "orange" },
  { body: "Lab dips and finishing", icon: "DYE", title: "Dyeing Units", tone: "violet" },
  { body: "Screen, digital, pigment", icon: "PRN", title: "Printing Units", tone: "blue" },
  { body: "Heads, designs, job work", icon: "EMB", title: "Embroidery Units", tone: "emerald" },
  { body: "Wash, compact, special finish", icon: "WSH", title: "Washing Units", tone: "orange" },
  { body: "Cartons, polybags, labels", icon: "PKG", title: "Packing Units", tone: "violet" },
  { body: "Factories and job work", icon: "GAR", title: "Garment Manufacturers", tone: "blue" },
  { body: "IEC and global markets", icon: "EXP", title: "Exporters", tone: "emerald" },
  { body: "Sourcing and buyer desks", icon: "BUY", title: "Buying Houses", tone: "orange" },
  { body: "Dispatch and forwarding", icon: "LOG", title: "Logistics Providers", tone: "violet" },
  { body: "Machines and spares", icon: "MAC", title: "Machinery Suppliers", tone: "blue" },
  { body: "Buttons, zips, trims", icon: "ACC", title: "Labels and Accessories", tone: "emerald" },
  { body: "Compliance and sourcing", icon: "CON", title: "Textile Consultants", tone: "orange" },
  { body: "ERP, billing, automation", icon: "SFT", title: "Software Providers", tone: "violet" },
  { body: "Print, stitch, finish support", icon: "JOB", title: "Job Work Providers", tone: "blue" },
  { body: "Credit, insurance, exports", icon: "FIN", title: "Finance and Insurance", tone: "emerald" },
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

const plans = [
  { name: "Free", price: "0", body: "Basic listing for onboarding the ecosystem.", benefits: ["Company profile", "1 product/service", "5 leads per month"] },
  { name: "Silver", price: "999", body: "Better visibility and lead access.", benefits: ["Priority listing", "10 products/services", "Lead contact access"] },
  { name: "Gold", price: "2,999", body: "Trust, alerts, and unlimited catalog.", benefits: ["Top placement", "Unlimited products", "Verification badge"] },
  { name: "Platinum", price: "9,999", body: "Premium discovery and assisted sourcing.", benefits: ["Homepage placement", "Dedicated support", "Export intelligence"] },
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
  ["Matched Supplier Leads", "rfq", "Route buyer opportunities to relevant suppliers by capability, location, and verification."],
  ["Membership Plans", "membership", "Choose visibility, verification, catalog, and lead-access benefits."],
  ["Events and Jobs", "events", "Explore exhibitions, buyer-seller meets, training, vacancies, and applications."],
]

const networkMenuItems = [
  ["Association Hub", "associations", "Connect with TEAMA, TEA, NIFT-TEA, TAEF, buying offices, and ecosystem partners."],
  ["Member Momentum", "stats", "View growing membership, verified companies, buyer requirements, orders, and market reach."],
  ["Business Ecosystem", "marketplace", "Explore directory, RFQ, capacity, networking, events, jobs, and follow-up modules."],
  ["Regional Network", "expansion", "Follow expansion from Tirupur to Coimbatore, Erode, Karur, and Tamil Nadu."],
]

const insightMenuItems = [
  ["Industry Journal", "blog", "Read practical sourcing, capacity, compliance, export, and business-growth guidance."],
  ["Market Reports", "reports", "Track companies, RFQs, leads, contact reveals, categories, conversion, and revenue."],
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

const brandMarqueeLogos = [
  ["TC", "Tirupur Connect", "Network"],
  ["TEAMA", "Exporters & Manufacturers", "Association"],
  ["TEA", "Tiruppur Exporters", "Association"],
  ["NIFT", "NIFT-TEA", "Skills"],
  ["TAEF", "Tamil Nadu Entrepreneurs", "Federation"],
  ["TT", "The Tirupur Textiles", "Buying Office"],
  ["FAB", "Fabric Suppliers", "Marketplace"],
  ["KNT", "Knitting Units", "Capacity"],
  ["DYE", "Dyeing & Processing", "Job Work"],
  ["GAR", "Garment Manufacturers", "Factory"],
  ["ACC", "Labels & Accessories", "Supply"],
  ["LOG", "Logistics Providers", "Export"],
  ["CX", "Codexsun", "Platform"],
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

      <PublicSection
        eyebrow="Why Tirupur Connect"
        id="why"
        title="Tirupur is strong, but business discovery is still fragmented"
        body="One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions."
        tone="white"
      >
        <ImageStory
          image={knittedFabricRollsImage}
          items={["Supplier search", "Factory capacity", "Product catalog", "QR profile"]}
          label="Knitted fabric rolls to finished business"
          slides={whyStorySlides}
          title="From Tirupur knitted fabric rolls to verified export-ready supplier profiles."
        />
      </PublicSection>

      <PublicSection
        eyebrow="Business Directory"
        id="directory"
        title="Searchable textile categories built for Tirupur's value chain"
        body="Find companies by real textile language: fabric, yarn, knitting, dyeing, printing, job work, exporters, accessories, logistics, and services."
        tone="soft"
      >
        <CategoryCloud categories={categories} />
      </PublicSection>

      <PublicSection
        eyebrow="Public company profile"
        id="profiles"
        title="Every supplier profile should tell buyers what matters before the first call"
        body="Each profile shows trust, capacity, products, certificates, photos, maps, contact actions, and quote flow."
        tone="white"
      >
        <CompanyProfileShowcase />
      </PublicSection>

      <PublicSection
        eyebrow="Network momentum"
        id="stats"
        title="A growing business network measured by useful outcomes"
        body="Members, verified factories, buyer requirements, connected orders, and market reach show whether the platform is creating real business value."
        tone="blue"
      >
        <AnimatedStats />
      </PublicSection>

      <PublicSection
        eyebrow="Core ecosystem modules"
        id="marketplace"
        title="More than a directory: a textile operating network"
        body="Directory, profiles, verification, RFQs, capacity, networking, events, jobs, news, ads, analytics, and CRM-like follow-up."
        tone="green"
      >
        <CardGrid cards={ecosystemCards} />
      </PublicSection>

      <PublicSection
        eyebrow="RFQ and business leads"
        id="rfq"
        title="The revenue engine is buyer requirements and supplier response"
        body="Buyers post requirements. Suppliers receive matched leads, quote faster, and unlock contact access by plan."
        tone="white"
      >
        <RfqFlow />
      </PublicSection>

      <PublicSection
        eyebrow="Capacity exchange"
        id="capacity"
        title="Idle capacity becomes a searchable business asset"
        body="Factories can publish spare capacity, machine type, MOQ, lead time, and location."
        tone="blue"
      >
        <ImageStory
          image={spinningLineImage}
          label="Factory utilization"
          title="A live capacity board can help factories fill idle time and buyers find faster job-work slots."
          items={["Available machines", "Lead time", "MOQ", "Location"]}
          reverse
        />
      </PublicSection>

      <PublicSection
        eyebrow="Verified supplier program"
        id="verification"
        title="Trust badges should become a serious paid product"
        body="Basic, GST, IEC, factory, export, premium, and association badges help buyers trust faster."
        tone="white"
      >
        <VerificationStack />
      </PublicSection>

      <PublicSection
        eyebrow="Membership model"
        id="membership"
        title="Free listing first. Paid visibility after value is proven."
        body="Members pay for better visibility, lead access, trust badges, premium placement, and time saved."
        tone="soft"
      >
        <PlanGrid />
      </PublicSection>

      <PublicSection
        eyebrow="Associations and sister concerns"
        id="associations"
        title="Build the network with institutions that already hold industry trust"
        body="Association hubs can carry notices, events, member directories, polls, committees, and onboarding drives."
        tone="blue"
      >
        <AssociationGrid />
      </PublicSection>

      <PublicSection
        eyebrow="Events, Jobs, News"
        id="events"
        title="Daily reasons to return keep subscribers active"
        body="Exhibitions, training, jobs, resumes, news, GST updates, schemes, and trade policy keep the network active."
        tone="white"
      >
        <ThreeColumnPanels />
      </PublicSection>

      <PublicSection
        eyebrow="Textile business journal"
        id="blog"
        title="Practical ideas for suppliers, manufacturers, and global buyers"
        body="Short, useful guidance on sourcing, production capacity, compliance, exports, and turning stronger company profiles into qualified business."
        tone="soft"
      >
        <BlogGrid onNavigate={go} />
      </PublicSection>

      <PublicSection
        eyebrow="Analytics and admin"
        id="reports"
        title="Admin pages need rollups, not repeated full-table calculations"
        body="Track company growth, verified members, RFQs, leads, contact reveals, ad clicks, and revenue."
        tone="white"
      >
        <AnalyticsBoard />
      </PublicSection>

      <PublicSection
        eyebrow="Regional expansion"
        id="expansion"
        title="Start with Tirupur. Expand to Tamil Nadu textile networks."
        body="Use the same platform for Coimbatore, Erode, Karur, and future textile networks."
        tone="soft"
      >
        <ExpansionMap />
      </PublicSection>

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
          <a className="ghost-button" href="http://localhost:6010/sa/app-runtime">Admin</a>
          <button className="primary-button" type="button" onClick={() => onNavigate("rfq")}>Post RFQ</button>
          <button aria-label="Toggle theme" className="theme-button" type="button">☼</button>
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
          <a className="mobile-admin-link" href="http://localhost:6010/sa/app-runtime">Admin</a>
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
      slides={homeSliderSlides}
    />
  )
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
  const marqueeItems = [...brandMarqueeLogos, ...brandMarqueeLogos]

  return (
    <section className="logo-strip brand-marquee" aria-label="Associated brands and ecosystem partners">
      <DevBadge label="PLATFORM-STRIP" />
      <div className="brand-marquee-edge brand-marquee-edge-left" />
      <div className="brand-marquee-track">
        {marqueeItems.map(([mark, name, label], index) => (
          <span className="brand-logo-card" key={`${mark}-${index}`}>
            <span className="brand-logo-mark">{mark}</span>
            <span>
              <strong>{name}</strong>
              <small>{label}</small>
            </span>
          </span>
        ))}
      </div>
      <div className="brand-marquee-edge brand-marquee-edge-right" />
    </section>
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

function RfqFlow() {
  return (
    <div className="rfq-card-grid">
      {rfqSteps.map((step, index) => {
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

function BlogGrid({ onNavigate }: { onNavigate(target: string): void }) {
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

function PlanGrid() {
  return (
    <div className="plan-grid">
      {plans.map((plan, index) => (
        <Reveal className={`plan-card ${plan.name === "Gold" ? "featured" : ""}`} delay={index * 60} key={plan.name}>
          <p>{plan.name}</p>
          <h3>Rs {plan.price}<span>/month</span></h3>
          <small>{plan.body}</small>
          <ul>{plan.benefits.map((item) => <li key={item}>{item}</li>)}</ul>
        </Reveal>
      ))}
    </div>
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

function ThreeColumnPanels() {
  return (
    <div className="panel-grid">
      {[
        ["Events and exhibitions", "Trade shows, buyer-seller meets, seminars, training, registrations, ticketing, QR attendance, and networking."],
        ["Textile job portal", "Merchandising, production, quality, design, export documentation, accounts, marketing, compliance, resumes, and applications."],
        ["News and knowledge", "Textile news, export updates, government policies, GST updates, market intelligence, buyer opportunities, and MSME resources."],
      ].map(([title, body], index) => (
        <Reveal className="info-panel" delay={index * 60} key={title}>
          <h3>{title}</h3>
          <p>{body}</p>
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
          <a className="primary-button" href="http://localhost:6010/sa/app-runtime">Open app control</a>
          <a className="ghost-button" href="mailto:hello@tirupurconnect.com">Partner with us</a>
        </div>
      </Reveal>
    </section>
  )
}

function PublicFooter({ onNavigate }: { onNavigate(target: string): void }) {
  const columns: Array<{ title: string; items: string[] }> = [
    ["Marketplace", ["Directory", "Company profiles", "RFQs", "Capacity exchange"]],
    ["Revenue", ["Memberships", "Lead credits", "Verification", "Advertisements"]],
    ["Community", ["Associations", "Events", "Jobs", "News"]],
  ].map(([title, items]) => ({ title: String(title), items: items as string[] }))

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
          {items.map((item) => <button key={item} type="button">{item}</button>)}
        </div>
      ))}
    </footer>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
