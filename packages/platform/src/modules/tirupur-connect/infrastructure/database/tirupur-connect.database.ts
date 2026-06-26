import { sql, type Kysely } from 'kysely'
import { generatePublicUuid } from '../../../../shared/helpers/public-uuid.js'
import type { TirupurConnectDatabaseSchema } from './tirupur-connect.schema.js'

const categories = [
  'Fabric Suppliers',
  'Yarn Suppliers',
  'Knitting Units',
  'Dyeing Units',
  'Printing Units',
  'Embroidery Units',
  'Washing Units',
  'Packing Units',
  'Garment Manufacturers',
  'Exporters',
  'Buying Houses',
  'Logistics Providers',
  'Machinery Suppliers',
  'Labels and Accessories',
  'Textile Consultants',
  'Software Providers',
  'Job Work Providers',
] as const

const plans = [
  { key: 'free', name: 'Free', price: 0, leads: 5, products: 1, features: ['Basic listing', 'Limited visibility'] },
  { key: 'silver', name: 'Silver', price: 99900, leads: 25, products: 10, features: ['Priority listing', 'Lead access', 'Basic analytics'] },
  { key: 'gold', name: 'Gold', price: 299900, leads: 100, products: null, features: ['Top placement', 'RFQ alerts', 'Verification badge'] },
  { key: 'platinum', name: 'Platinum', price: 999900, leads: null, products: null, features: ['Featured listing', 'Advanced analytics', 'Assisted sourcing'] },
] as const

const defaultHomeSliderItems = [
  slider('home-slider-1', 'Tirupur textile network', "The digital business operating system for Tirupur's textile and garment industry", 'Connect, collaborate, manufacture, export, and grow through one focused B2B platform for suppliers, exporters, buyers, job-work units, service providers, associations, and talent.', 'https://images.unsplash.com/photo-1742281693317-c711080e8a19?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Network map', "From yarn to export dispatch in one searchable supplier graph", 'Build verified company profiles for every part of Tirupur’s knitwear value chain.', [['Y', 'Yarn and spinning', 'Mills'], ['K', 'Knitting units', 'Live'], ['G', 'Garment makers', 'Export'], ['B', 'Buyer RFQs', '24x7']]),
  slider('home-slider-2', 'Circular knitting', 'Find knitting capacity by gauge, fabric type, machine strength, and delivery window', 'Let fabric buyers discover circular knitting units, job-work capacity, jersey, rib, interlock, fleece, and export-ready knitted fabric sources.', 'https://images.unsplash.com/photo-1612685180040-e120061d47e3?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Capacity exchange', 'Knitting unit profile with available capacity, machines, and fabric specialization', 'Suppliers can publish monthly capacity while buyers filter by fabric, lead time, and location.', [['24', 'Gauge filters', 'Ready'], ['KG', 'Daily capacity', 'Kg'], ['JO', 'Job work', 'Open'], ['QC', 'Quality notes', 'Logged']], 'center 46%'),
  slider('home-slider-3', 'Dyeing and processing', 'Route fabric dyeing, compacting, washing, finishing, and processing inquiries faster', 'Buyers can search dyeing and processing partners by color capability, batch size, compliance readiness, and turnaround.', 'https://images.unsplash.com/photo-1534639077088-d702bcf685e7?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Processing workflow', 'Dyeing units need trust, compliance, capacity, and sample response visibility', 'Track category, shade capability, GST profile, and buyer inquiries in one place.', [['LAB', 'Lab dip support', 'Fast'], ['BTH', 'Batch tracking', 'Yes'], ['ECO', 'Compliance', 'Badge'], ['TAT', 'Turnaround', 'Days']], 'center 55%'),
  slider('home-slider-4', 'Garment manufacturing', 'Connect buyers with stitching units, factories, exporters, and make-to-order teams', 'Profiles can show production lines, machine count, MOQ, monthly capacity, product category, certifications, and export markets.', 'https://images.unsplash.com/photo-1742934029782-f2e6e5f0e169?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Factory profile', 'Manufacturing pages should show what a buyer checks before sending tech packs', 'Capacity, compliance, team size, product focus, sample timeline, and verified contact actions.', [['MOQ', 'Order quantity', 'Filter'], ['LINE', 'Production lines', 'Count'], ['SAM', 'Sampling', 'Track'], ['EXP', 'Export ready', 'Badge']], 'center 42%'),
  slider('home-slider-5', 'Knitted garments', 'Showcase polos, t-shirts, hoodies, kidswear, innerwear, and activewear manufacturers', 'Tirupur Connect can become the first screen buyers open when they need trusted knitted garment capacity from Tamil Nadu.', 'https://images.unsplash.com/photo-1710440189404-e95fabead2a3?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Product catalog', 'Colorful garment catalog cards make suppliers easy to compare', 'Every company can publish products, images, MOQ, fabrics, sizes, and buyer-ready quotation actions.', [['TEE', 'T-shirt makers', 'Listed'], ['POLO', 'Polo capacity', 'Live'], ['KID', 'Kidswear', 'Search'], ['FIT', 'Activewear', 'RFQ']]),
  slider('home-slider-6', 'Fabric sourcing', 'Make fabric suppliers discoverable by GSM, composition, finish, pattern, and stock position', 'Support fabric mills, traders, stockists, knitted fabric suppliers, and special fabric sellers with fast search and RFQ matching.', 'https://images.unsplash.com/photo-1771098206672-8996549a59f2?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Fabric intelligence', 'Buyers search by composition, GSM, width, finish, and available quantity', 'A fabric profile can carry catalog images, stock notes, sample availability, and price indication.', [['GSM', 'GSM filter', 'Core'], ['COT', 'Cotton blends', 'Map'], ['STK', 'Stock lots', 'Fast'], ['SMP', 'Sample ready', 'Yes']]),
  slider('home-slider-7', 'Embroidery and printing', 'Bring job-work units into the buyer flow for embroidery, print, labels, and finishing', 'Decoration and value-add units can publish machines, design capability, turnaround, order minimums, and portfolio visuals.', 'https://images.unsplash.com/photo-1654110509803-4f53e0f9c192?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Job-work discovery', 'Embroidery, print, and finishing units need portfolio-first visibility', 'Profiles can carry machine details, sample work, buyer inquiry buttons, and verification badges.', [['EMB', 'Embroidery heads', 'Count'], ['PRN', 'Printing units', 'Route'], ['ART', 'Artwork support', 'Yes'], ['FIN', 'Finishing', 'Link']], 'center 42%'),
  slider('home-slider-8', 'Accessories and trims', 'Connect garment factories with labels, buttons, zippers, thread, packing, and trims suppliers', 'Accessory suppliers often decide delivery speed. Make them searchable by category, stock, MOQ, color options, and dispatch promise.', 'https://images.unsplash.com/photo-1654108890964-dd31a9cf3793?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Supply support', 'Accessories suppliers become visible exactly when factories need fast purchase support', 'Show available categories, color families, sample support, delivery terms, and WhatsApp ordering.', [['LBL', 'Labels', 'Ready'], ['BTN', 'Buttons', 'Stock'], ['ZIP', 'Zippers', 'Search'], ['PKG', 'Packing', 'Route']]),
  slider('home-slider-9', 'RFQ and lead engine', 'Business opportunities first. Directory listing second.', 'Buyers post requirements, suppliers receive matched alerts, paid members unlock contacts, and every lead moves through quote, negotiation, and follow-up.', 'https://images.unsplash.com/photo-1741183396974-7a4b21d52e11?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Live RFQ example', 'Need 25,000 cotton polo T-shirts for Germany', 'Matching verified suppliers receive app, email, and WhatsApp-ready alerts.', [['2K', 'Free companies target', '2,000+'], ['100', 'Year-one paid members', '100+'], ['5', 'Verification levels', '5'], ['24', 'RFQ alerts', '24x7']], 'center 45%'),
  slider('home-slider-10', 'Verified trust network', 'Build a supplier graph that buyers can trust before they call', 'GST, IEC, factory, export, association, and premium verification badges make discovery faster and help serious suppliers stand out.', 'https://images.unsplash.com/photo-1534639077088-d702bcf685e7?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'Trust layer', 'Verification badges turn local search into buyer confidence', 'GST, IEC, factory, export, association, and premium verification can become a paid trust product.', [['GST', 'GST verified', 'Badge'], ['IEC', 'Exporter profile', 'Ready'], ['FAC', 'Factory check', 'Audit'], ['QR', 'QR profile', 'Share']], 'center 48%'),
] as const

const defaultPlatformStripItems = [
  platformBrand('tirupur-connect', 'TC', 'Tirupur Connect', 'Network', '/associations/tirupur-connect.svg'),
  platformBrand('teama', 'TEAMA', 'Exporters & Manufacturers', 'Association', '/associations/teama.png'),
  platformBrand('tea', 'TEA', 'Tiruppur Exporters', 'Association', '/associations/tea.png'),
  platformBrand('nift-tea', 'NIFT', 'NIFT-TEA', 'Skills', '/associations/nift-tea.png'),
  platformBrand('taef', 'TAEF', 'Tamil Nadu Entrepreneurs', 'Federation'),
  platformBrand('tirupur-textiles', 'TT', 'The Tirupur Textiles', 'Buying Office', '/associations/tirupur-textiles.png'),
  platformBrand('fabric-suppliers', 'FAB', 'Fabric Suppliers', 'Marketplace'),
  platformBrand('knitting-units', 'KNT', 'Knitting Units', 'Capacity'),
  platformBrand('dyeing-processing', 'DYE', 'Dyeing & Processing', 'Job Work'),
  platformBrand('garment-manufacturers', 'GAR', 'Garment Manufacturers', 'Factory'),
  platformBrand('labels-accessories', 'ACC', 'Labels & Accessories', 'Supply'),
  platformBrand('logistics-providers', 'LOG', 'Logistics Providers', 'Export'),
  platformBrand('codexsun', 'CX', 'Codexsun', 'Platform'),
] as const

const defaultWhySection = {
  eyebrow: 'Why Tirupur Connect',
  title: 'Tirupur is strong, but business discovery is still fragmented',
  body: 'One network for suppliers, capacity, buyers, services, jobs, updates, and trusted introductions.',
  label: 'Knitted fabric rolls to finished business',
  headline: 'From Tirupur knitted fabric rolls to verified export-ready supplier profiles.',
  image: 'https://images.unsplash.com/photo-1771098206672-8996549a59f2?auto=format&fit=crop&fm=jpg&q=84&w=1800',
} as const

const defaultDirectorySection = {
  eyebrow: 'Business Directory',
  title: "Searchable textile categories built for Tirupur's value chain",
  body: 'Find companies by real textile language: fabric, yarn, knitting, dyeing, printing, job work, exporters, accessories, logistics, and services.',
  helperTitle: 'Live marketplace directory',
  helperBody: 'Category cards and company profiles below this header are live marketplace records. Use this designer screen only for the public section positioning and visitor-facing copy.',
} as const

const defaultProfileSection = {
  eyebrow: 'Public company profile',
  title: 'Every supplier profile should tell buyers what matters before the first call',
  body: 'Each profile shows trust, capacity, products, certificates, photos, maps, contact actions, and quote flow.',
  helperTitle: 'Live profile showcase',
  helperBody: 'The rotating company profile and product cards stay connected to marketplace data. Use this designer screen for the public section copy and tone only.',
} as const

const defaultStatsSection = {
  eyebrow: 'Network momentum',
  title: 'A growing business network measured by useful outcomes',
  body: 'Members, verified factories, buyer requirements, connected orders, and market reach show whether the platform is creating real business value.',
  helperTitle: 'Animated marketplace metrics',
  helperBody: 'The number cards remain animated public indicators. Use this designer screen to control the section headline, support copy, tone, and visibility.',
} as const

const defaultEcosystemSection = {
  eyebrow: 'Core ecosystem modules',
  title: 'More than a directory: a textile operating network',
  body: 'Directory, profiles, verification, RFQs, capacity, networking, events, jobs, news, ads, analytics, and CRM-like follow-up.',
} as const

const defaultEcosystemItems = [
  ecosystemCard('business-directory', 'Business directory', 'Search by category, product, service, capacity, location, exporter status, and certification.', 'Directory cards expose the right decision signals: verification, MOQ, capacity, lead time, location, response speed, and premium visibility.'),
  ecosystemCard('digital-profile', 'Digital profile', 'Every company gets a mini website and QR business card.', 'Logo, banner, catalog, factory photos, videos, certificates, machinery, export markets, map, WhatsApp, call, email, inquiry, and report actions.'),
  ecosystemCard('verified-supplier', 'Verified supplier', 'Trust score and badge stack for serious suppliers.', 'Basic, GST, IEC, factory, export, premium, association, and renewal checks can become a paid annual verification product.'),
  ecosystemCard('rfq-marketplace', 'RFQ marketplace', 'Buyers post requirements and suppliers quote with proposals.', 'Garments, fabrics, yarn, printing, embroidery, job work, and export inquiries flow through matched suppliers and lead-credit rules.'),
  ecosystemCard('capacity-exchange', 'Capacity exchange', 'Convert idle production capacity into live business.', 'Knitting, dyeing, printing, embroidery, stitching, washing, and finishing units can publish available capacity and fill gaps faster.'),
  ecosystemCard('networking', 'Networking', "Textile industry's own professional network.", 'Companies follow each other, post updates, share opportunities, message, comment, and build daily engagement around trade.'),
] as const

const defaultMarketplaceSection = {
  eyebrow: 'Textile marketplace',
  title: 'A B2B catalog for fabric, yarn, accessories, stock lots, garments, and machinery',
  body: 'Suppliers can list what they sell while buyers browse by real textile buying signals: quantity, category, MOQ, stock, sample readiness, and dispatch promise.',
} as const

const defaultMarketplaceItems = [
  ecosystemCard('fabric', 'Fabric', 'Knitted and woven fabric discovery', 'Fabric suppliers can list GSM, composition, width, finish, color family, sample support, and stock availability.'),
  ecosystemCard('yarn', 'Yarn', 'Yarn and raw-material listings', 'Yarn suppliers can publish counts, blends, mill origin, MOQ, cone details, and dispatch promise.'),
  ecosystemCard('accessories', 'Accessories', 'Accessories and trims marketplace', 'Labels, buttons, zippers, thread, packing, hang tags, trims, and consumables become searchable by category.'),
  ecosystemCard('surplus', 'Surplus', 'Leftover inventory and stock lots', 'Move leftover fabric, surplus stock, seconds, ready garments, and urgent inventory with clear quantity and pricing notes.'),
  ecosystemCard('garments', 'Garments', 'Ready garments and make-to-order', 'Manufacturers can show t-shirts, polos, hoodies, kidswear, innerwear, activewear, and custom programs.'),
  ecosystemCard('machinery', 'Machinery', 'Machinery and textile services', 'Machine suppliers and service providers can publish textile machinery, spares, AMC support, and installation services.'),
] as const

const defaultRfqSection = {
  eyebrow: 'RFQ and business leads',
  title: 'The revenue engine is buyer requirements and supplier response',
  body: 'Buyers post requirements. Suppliers receive matched leads, quote faster, and unlock contact access by plan.',
} as const

const defaultRfqItems = [
  rfqCard('buyer-requirement', 'Buyer requirement', 'Post', 'Buyer adds product, quantity, target price, delivery date, destination, certifications, and attachments.', 'send', 'blue'),
  rfqCard('supplier-discovery', 'Supplier discovery', 'Match', 'System routes the RFQ to suppliers by category, capacity, location, verification, and membership entitlement.', 'scan-search', 'emerald'),
  rfqCard('commercial-response', 'Commercial response', 'Quote', 'Suppliers submit quotations, upload proposals, ask questions, or mark not interested.', 'file-text', 'orange'),
  rfqCard('business-conversion', 'Business conversion', 'Convert', 'Buyer compares offers, reveals contact, negotiates, and moves the opportunity into CRM follow-up.', 'handshake', 'violet'),
] as const

const defaultBroadcastSection = {
  eyebrow: 'Buyer requirement broadcast',
  title: 'Matched suppliers should hear about buyer requirements instantly',
  body: 'A posted requirement becomes a routed alert through mobile push, WhatsApp, and email, then supplier responses are tracked for buyer comparison.',
} as const

const defaultBroadcastItems = [
  rfqCard('requirement-captured', 'Requirement captured', 'Requirement captured', 'Buyer requirement is captured with product, quantity, destination, timeline, certification, and attachments.', 'send', 'blue'),
  rfqCard('supplier-matching', 'Supplier matching', 'Supplier matching', 'Matching suppliers are selected by category, product capability, capacity, location, trust level, and plan access.', 'scan-search', 'emerald'),
  rfqCard('instant-broadcast', 'Instant broadcast', 'Instant broadcast', 'Mobile push, WhatsApp, and email alerts reach relevant suppliers quickly so the lead does not go cold.', 'bell-ring', 'orange'),
  rfqCard('response-tracking', 'Response tracking', 'Response tracking', 'Supplier responses, quotes, questions, and follow-ups are tracked for buyer comparison and conversion.', 'handshake', 'violet'),
] as const

const defaultCapacitySection = {
  eyebrow: 'Capacity exchange',
  title: 'Idle capacity becomes a searchable business asset',
  body: 'Factories can publish spare capacity, machine type, MOQ, lead time, and location.',
  image: 'https://images.unsplash.com/photo-1742281693317-c711080e8a19?auto=format&fit=crop&fm=jpg&q=84&w=1800',
  label: 'Factory utilization',
  storyTitle: 'A live capacity board can help factories fill idle time and buyers find faster job-work slots.',
  items: ['Available machines', 'Lead time', 'MOQ', 'Location'],
} as const

const defaultNetworkingSection = {
  eyebrow: 'Business networking',
  title: "Tirupur's textile industry needs its own professional network",
  body: 'Companies, professionals, associations, service partners, and buying offices can build a trusted business graph around real trade activity.',
} as const

const defaultNetworkingItems = [
  ecosystemCard('follow', 'Follow', 'Follow companies and professionals', 'Companies and professionals can follow one another to build a textile-first business graph.'),
  ecosystemCard('post', 'Post', 'Share textile business updates', 'Publish business updates, capacity openings, new products, certificates, event visits, and buyer-ready announcements.'),
  ecosystemCard('discuss', 'Discuss', 'Industry discussions and introductions', 'Comment, like, discuss market movement, ask sourcing questions, and create introductions through trusted context.'),
  ecosystemCard('engage', 'Engage', 'Daily network engagement', 'Associations, job-work units, buying offices, exporters, and service partners can keep the ecosystem active every day.'),
] as const

const remainingFrontendSections = [
  sectionSeed('qr-profile-section', 'showcase', 'Digital business card and QR profile', 'Every company profile should be scan-ready at meetings, factories, and exhibitions', 'A QR profile gives every supplier a public profile URL, product catalog, contact person, WhatsApp action, map, and inquiry path.', 'white', 13, '#qr-profile', [
    ecosystemCard('public-url', 'Public URL', 'Shareable company profile', 'Each supplier receives a public profile URL that works like a focused mini website.'),
    ecosystemCard('qr-code', 'QR code', 'Scan-ready buyer access', 'QR cards can be printed on visiting cards, catalogs, invoices, stands, stickers, and trade fair booths.'),
    ecosystemCard('catalog', 'Catalog', 'Product and contact hub', 'Catalog, products, contact person, WhatsApp, map, certificates, and inquiry buttons stay available from one scan.'),
  ]),
  sectionSeed('verification-section', 'showcase', 'Verified supplier program', 'Trust badges should become a serious paid product', 'Basic, GST, IEC, factory, export, premium, and association badges help buyers trust faster.', 'white', 14, '#verification'),
  sectionSeed('membership-section', 'live-plans', 'Membership model', 'Free listing first. Paid visibility after value is proven.', 'Members pay for better visibility, lead access, trust badges, premium placement, and time saved.', 'soft', 15, '#membership'),
  sectionSeed('associations-section', 'showcase', 'Associations and sister concerns', 'Build the network with institutions that already hold industry trust', 'Association hubs can carry notices, events, member directories, polls, committees, and onboarding drives.', 'blue', 16, '#associations'),
  sectionSeed('events-section', 'live-news-events', 'Events, Jobs, News', 'Daily reasons to return keep subscribers active', 'Exhibitions, training, jobs, resumes, news, GST updates, schemes, and trade policy keep the network active.', 'white', 17, '#events'),
  sectionSeed('reports-section', 'analytics', 'Analytics and admin', 'Admin pages need rollups, not repeated full-table calculations', 'Track company growth, verified members, RFQs, leads, contact reveals, ad clicks, and revenue.', 'white', 19, '#reports'),
  sectionSeed('export-intelligence-section', 'card-grid', 'Export intelligence center', 'Premium members need export signals, not only directory visibility', 'Country-wise export movement, product demand, global opportunities, currency updates, and trade alerts can turn Tirupur Connect into a decision tool.', 'blue', 20, '#export-intelligence', [
    ecosystemCard('market-trends', 'Market trends', 'Country-wise export trends', 'Track country-wise export movement, product demand, and buyer-market opportunities for Tirupur categories.'),
    ecosystemCard('alerts', 'Alerts', 'Global opportunity signals', 'Premium members can monitor product demand, currency movement, trade statistics, and timely export alerts.'),
    ecosystemCard('guides', 'Guides', 'Export knowledge library', 'Knowledge guides cover export documentation, LC/DA/DP basics, GST, MSME schemes, and compliance checklists.'),
  ]),
  sectionSeed('finance-section', 'card-grid', 'Finance marketplace', 'Connect factories and exporters with the right finance partners', 'Working capital, invoice discounting, export finance, factoring, and insurance can be routed through trusted referral partnerships.', 'white', 21, '#finance', [
    ecosystemCard('working-capital', 'Working capital', 'Cash-flow support for factories', 'Connect SMEs with working-capital providers based on business profile, invoices, RFQ pipeline, and verification strength.'),
    ecosystemCard('finance-marketplace', 'Finance marketplace', 'Lenders, factors, and insurers', 'Enable invoice discounting, factoring, export finance, insurance, and referral-led financial services.'),
    ecosystemCard('revenue', 'Revenue', 'Partner-led finance referrals', 'Revenue can come through verified referral partnerships while members receive faster access to relevant finance options.'),
  ]),
  sectionSeed('ai-assistant-section', 'showcase', 'AI textile assistant', 'Make industry search conversational for buyers and suppliers', "The assistant can help users find suppliers, explain export terms, discover available capacity, and navigate Tirupur's textile ecosystem.", 'soft', 22, '#ai-assistant'),
  sectionSeed('advertising-section', 'card-grid', 'Advertising and promotion center', 'Promotions become a recurring revenue layer on top of discovery', 'Homepage banners, category banners, featured companies, sponsored posts, and event sponsorships give paid members stronger visibility.', 'green', 23, '#advertising', [
    ecosystemCard('banners', 'Banners', 'Homepage and category visibility', 'Homepage and category banners can promote suppliers, associations, events, offers, and buyer campaigns.'),
    ecosystemCard('featured', 'Featured', 'Featured companies and premium placement', 'Featured company slots help paid members stand above normal directory results.'),
    ecosystemCard('sponsored', 'Sponsored', 'Sponsored posts and events', 'Sponsored posts, event sponsorships, and promoted RFQs add recurring revenue without changing the core product.'),
  ]),
  sectionSeed('mobile-app-section', 'showcase', 'Mobile application', 'RFQs, leads, saved companies, and chat actions should travel with the user', 'Android and iOS support makes the marketplace practical for factory owners, merchandisers, suppliers, and field teams.', 'white', 24, '#mobile-app', [
    ecosystemCard('notifications', 'Notifications', 'Instant lead and RFQ alerts', 'Suppliers receive RFQ alerts, lead notifications, saved company updates, chat prompts, and follow-up reminders.'),
    ecosystemCard('saved-work', 'Saved work', 'Saved companies and leads', 'Users can save companies, leads, products, and contacts for later action from mobile.'),
    ecosystemCard('whatsapp', 'WhatsApp', 'Chat and contact actions', 'WhatsApp integration keeps local business behavior familiar while the platform keeps the business record.'),
  ]),
  sectionSeed('crm-lite-section', 'card-grid', 'Textile CRM Lite', 'Small textile businesses need simple lead discipline', 'Leads, quotations, notes, tasks, reminders, and follow-up dates turn public discovery into repeatable sales motion.', 'soft', 25, '#crm-lite', [
    ecosystemCard('leads', 'Leads', 'Lead pipeline for textile SMEs', 'Members can manage leads from RFQs, profile inquiries, contact reveals, events, and manual opportunities.'),
    ecosystemCard('follow-up', 'Follow-up', 'Simple follow-up discipline', 'Track follow-ups, quotations, notes, tasks, reminders, and next action dates without a heavy CRM.'),
    ecosystemCard('premium', 'Premium', 'CRM Lite as upgrade path', 'Premium plans can unlock team access, lead assignment, quote history, and conversion reporting.'),
  ]),
  sectionSeed('multilingual-section', 'card-grid', 'Multilingual platform', 'English, Tamil, and Hindi keep the platform usable across the full industry', 'Exporters, factory owners, job-work units, buyers, service providers, and workers should all be able to understand and participate.', 'white', 26, '#multilingual', [
    ecosystemCard('english', 'English', 'Buyer and export language', 'English keeps exporter, buyer, and professional service communication clear.'),
    ecosystemCard('tamil', 'Tamil', 'Local industry adoption', 'Tamil supports wider factory, job-work, association, and local-service adoption.'),
    ecosystemCard('hindi', 'Hindi', 'National business reach', 'Hindi helps with wider Indian supplier, buyer, worker, and trade-service reach.'),
  ]),
  sectionSeed('expansion-section', 'showcase', 'Regional expansion', 'Start with Tirupur. Expand to Tamil Nadu textile networks.', 'Use the same platform for Coimbatore, Erode, Karur, and future textile networks.', 'soft', 27, '#expansion'),
] as const

const defaultBlogCategories = [
  ['Sourcing', 'sourcing', 'Supplier discovery, buyer requirements, and procurement guidance.', '#0ea5e9'],
  ['Manufacturing', 'manufacturing', 'Knitting, dyeing, stitching, processing, and factory capacity insights.', '#10b981'],
  ['Export', 'export', 'Export markets, documentation, payment terms, and global buyer signals.', '#f97316'],
  ['Compliance', 'compliance', 'GST, verification, certifications, schemes, and audit-ready business practice.', '#8b5cf6'],
] as const

const defaultBlogTags = ['RFQ', 'Tirupur', 'Knitted garments', 'Factory capacity', 'GST', 'Export buyers', 'Verification', 'WhatsApp leads'] as const

const defaultWhyStoryItems = [
  whyStory('supplier-search', 'Supplier search', 'Find the right Tirupur supplier before the first phone call.', 'Buyers can search fabric, yarn, knitting, dyeing, printing, embroidery, accessories, and job-work suppliers with real business filters instead of random contact lists.', defaultWhySection.image, 'blue'),
  whyStory('factory-capacity', 'Factory capacity', 'Turn idle knitting, processing, and stitching capacity into visible business.', 'Factory cards can show monthly capacity, machines, line strength, sample readiness, turnaround, MOQ, and verified production status for faster buyer decisions.', 'https://images.unsplash.com/photo-1742934029782-f2e6e5f0e169?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'emerald'),
  whyStory('product-catalog', 'Product catalog', 'Show products, capabilities, and proof in one profile.', 'Companies can publish knitted garments, fabric types, trims, certifications, sample photos, MOQ, GSM, composition, and export markets on a buyer-ready profile.', 'https://images.unsplash.com/photo-1710440189404-e95fabead2a3?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'orange'),
  whyStory('qr-profile', 'QR profile', 'Make every company profile easy to share, scan, and trust.', 'Every verified company can share a public QR profile on visiting cards, WhatsApp, catalogs, invoices, and trade fair stalls to capture inquiries directly.', 'https://images.unsplash.com/photo-1741183396974-7a4b21d52e11?auto=format&fit=crop&fm=jpg&q=84&w=1800', 'violet'),
] as const

export const tirupurConnectDatabaseModule: {
  name: string
  migrate(database: Kysely<TirupurConnectDatabaseSchema>): Promise<void>
  seed(database: Kysely<TirupurConnectDatabaseSchema>): Promise<void>
} = {
  name: 'tirupur-connect',
  async migrate(database) {
    for (const statement of migrationStatements) {
      await sql.raw(statement).execute(database)
    }
  },
  async seed(database) {
    for (let index = 0; index < categories.length; index += 1) {
      const name = categories[index]
      const slug = slugify(name)
      await database
        .insertInto('tc_categories')
        .values({
          uuid: generatePublicUuid(),
          name,
          slug,
          sort_order: index + 1,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ name, sort_order: index + 1, status: 'active' })
        .execute()
    }

    for (let index = 0; index < plans.length; index += 1) {
      const plan = plans[index]
      await database
        .insertInto('tc_membership_plans')
        .values({
          uuid: generatePublicUuid(),
          plan_key: plan.key,
          name: plan.name,
          description: plan.features.join(', '),
          price_paise: plan.price,
          currency: 'INR',
          billing_cycle: 'monthly',
          lead_limit: plan.leads,
          product_limit: plan.products,
          features: JSON.stringify(plan.features),
          sort_order: index + 1,
          status: 'active',
        })
        .onDuplicateKeyUpdate({
          name: plan.name,
          description: plan.features.join(', '),
          price_paise: plan.price,
          lead_limit: plan.leads,
          product_limit: plan.products,
          features: JSON.stringify(plan.features),
          sort_order: index + 1,
          status: 'active',
        })
        .execute()
    }

    await seedFrontendDesigner(database)
  },
}

const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS tc_accounts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL, email VARCHAR(191) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(80) NULL, role VARCHAR(80) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'active',
    email_verified_at DATETIME NULL, last_login_at DATETIME NULL, metadata LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, INDEX idx_tc_accounts_role_status (role, status)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, parent_id INT NULL,
    name VARCHAR(191) NOT NULL, slug VARCHAR(191) NOT NULL UNIQUE, description TEXT NULL, icon VARCHAR(191) NULL,
    sort_order INT NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_categories_parent (parent_id, status)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_companies (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, account_id INT NULL,
    source_type VARCHAR(40) NOT NULL, source_tenant_id INT NULL, external_record_uuid VARCHAR(80) NULL, current_revision_id INT NULL,
    name VARCHAR(191) NOT NULL, legal_name VARCHAR(191) NULL, slug VARCHAR(191) NOT NULL UNIQUE, description TEXT NULL,
    business_type VARCHAR(120) NULL, gstin VARCHAR(32) NULL, iec_number VARCHAR(32) NULL,
    email VARCHAR(191) NULL, phone VARCHAR(80) NULL, whatsapp VARCHAR(80) NULL,
    contact_person_name VARCHAR(191) NULL, contact_person_designation VARCHAR(120) NULL,
    contact_person_email VARCHAR(191) NULL, contact_person_phone VARCHAR(80) NULL, contact_person_whatsapp VARCHAR(80) NULL,
    website VARCHAR(255) NULL,
    address TEXT NULL, city VARCHAR(120) NULL, state VARCHAR(120) NULL, country VARCHAR(120) NULL, pincode VARCHAR(20) NULL,
    latitude DOUBLE NULL, longitude DOUBLE NULL, year_established INT NULL, employee_count INT NULL,
    factory_size VARCHAR(120) NULL, monthly_capacity VARCHAR(120) NULL, minimum_order_quantity DOUBLE NULL, lead_time VARCHAR(120) NULL,
    export_markets LONGTEXT NULL, certifications LONGTEXT NULL, social_links LONGTEXT NULL, logo_url VARCHAR(500) NULL, cover_url VARCHAR(500) NULL,
    verification_level VARCHAR(80) NOT NULL DEFAULT 'none', trust_score INT NOT NULL DEFAULT 0, membership_tier VARCHAR(80) NOT NULL DEFAULT 'free',
    publication_status VARCHAR(40) NOT NULL DEFAULT 'draft', published_at DATETIME NULL, featured_until DATETIME NULL,
    created_by INT NULL, updated_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at DATETIME NULL,
    UNIQUE KEY uq_tc_company_source (source_type, source_tenant_id, external_record_uuid),
    INDEX idx_tc_companies_public (publication_status, verification_level, city),
    INDEX idx_tc_companies_account (account_id),
    CONSTRAINT fk_tc_companies_account FOREIGN KEY (account_id) REFERENCES tc_accounts(id)
  )`,
  `ALTER TABLE tc_companies ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(191) NULL AFTER whatsapp`,
  `ALTER TABLE tc_companies ADD COLUMN IF NOT EXISTS contact_person_designation VARCHAR(120) NULL AFTER contact_person_name`,
  `ALTER TABLE tc_companies ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(191) NULL AFTER contact_person_designation`,
  `ALTER TABLE tc_companies ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(80) NULL AFTER contact_person_email`,
  `ALTER TABLE tc_companies ADD COLUMN IF NOT EXISTS contact_person_whatsapp VARCHAR(80) NULL AFTER contact_person_phone`,
  `CREATE TABLE IF NOT EXISTS tc_company_categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, company_id INT NOT NULL, category_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_tc_company_category (company_id, category_id),
    CONSTRAINT fk_tc_company_categories_company FOREIGN KEY (company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_company_categories_category FOREIGN KEY (category_id) REFERENCES tc_categories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_products (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, company_id INT NOT NULL, category_id INT NULL,
    source_type VARCHAR(40) NOT NULL DEFAULT 'web', external_record_uuid VARCHAR(80) NULL, current_revision_id INT NULL,
    name VARCHAR(191) NOT NULL, slug VARCHAR(191) NOT NULL, sku VARCHAR(120) NULL, description TEXT NULL, unit VARCHAR(40) NULL,
    price_from DOUBLE NULL, currency CHAR(3) NOT NULL DEFAULT 'INR', moq DOUBLE NULL, lead_time VARCHAR(120) NULL,
    fabric_details TEXT NULL, sizes LONGTEXT NULL, colours LONGTEXT NULL, certifications LONGTEXT NULL, media LONGTEXT NULL,
    publication_status VARCHAR(40) NOT NULL DEFAULT 'draft', published_at DATETIME NULL, created_by INT NULL, updated_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, UNIQUE KEY uq_tc_product_company_slug (company_id, slug),
    UNIQUE KEY uq_tc_product_external (company_id, external_record_uuid),
    INDEX idx_tc_products_public (publication_status, category_id),
    CONSTRAINT fk_tc_products_company FOREIGN KEY (company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_products_category FOREIGN KEY (category_id) REFERENCES tc_categories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_submissions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, source_tenant_id INT NOT NULL,
    source_tenant_slug VARCHAR(120) NOT NULL, external_record_uuid VARCHAR(80) NOT NULL, entity_type VARCHAR(40) NOT NULL,
    latest_revision_id INT NULL, sync_version INT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'submitted',
    submitted_at DATETIME NOT NULL, reviewed_by INT NULL, reviewed_at DATETIME NULL, review_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_submission_source (source_tenant_id, entity_type, external_record_uuid),
    INDEX idx_tc_submissions_review (status, submitted_at)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_submission_revisions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, submission_id INT NOT NULL,
    revision_number INT NOT NULL, sync_version INT NOT NULL, payload LONGTEXT NOT NULL, payload_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'submitted', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_submission_revision (submission_id, revision_number),
    CONSTRAINT fk_tc_submission_revisions_submission FOREIGN KEY (submission_id) REFERENCES tc_submissions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_sync_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, idempotency_key VARCHAR(191) NOT NULL UNIQUE,
    source_tenant_id INT NULL, signature VARCHAR(191) NOT NULL, payload_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL, response_payload LONGTEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tc_rfqs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, buyer_account_id INT NOT NULL, buyer_company_id INT NULL,
    category_id INT NULL, title VARCHAR(191) NOT NULL, description TEXT NULL, quantity DOUBLE NOT NULL DEFAULT 0,
    unit VARCHAR(40) NULL, target_price DOUBLE NULL, currency CHAR(3) NOT NULL DEFAULT 'INR', delivery_date DATE NULL,
    delivery_location VARCHAR(255) NULL, certifications LONGTEXT NULL, attachments LONGTEXT NULL,
    privacy VARCHAR(40) NOT NULL DEFAULT 'public', status VARCHAR(40) NOT NULL DEFAULT 'under_review', expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, INDEX idx_tc_rfqs_public (status, category_id, delivery_date),
    CONSTRAINT fk_tc_rfqs_buyer FOREIGN KEY (buyer_account_id) REFERENCES tc_accounts(id),
    CONSTRAINT fk_tc_rfqs_company FOREIGN KEY (buyer_company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_rfqs_category FOREIGN KEY (category_id) REFERENCES tc_categories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_rfq_quotes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, rfq_id INT NOT NULL,
    supplier_account_id INT NOT NULL, supplier_company_id INT NOT NULL, price_per_unit DOUBLE NULL, total_amount DOUBLE NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR', quantity DOUBLE NULL, lead_time VARCHAR(120) NULL, validity_date DATE NULL,
    notes TEXT NULL, attachments LONGTEXT NULL, status VARCHAR(40) NOT NULL DEFAULT 'submitted',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_rfq_supplier_quote (rfq_id, supplier_company_id),
    CONSTRAINT fk_tc_quotes_rfq FOREIGN KEY (rfq_id) REFERENCES tc_rfqs(id),
    CONSTRAINT fk_tc_quotes_account FOREIGN KEY (supplier_account_id) REFERENCES tc_accounts(id),
    CONSTRAINT fk_tc_quotes_company FOREIGN KEY (supplier_company_id) REFERENCES tc_companies(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_inquiries (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, company_id INT NULL, product_id INT NULL,
    rfq_id INT NULL, account_id INT NULL, name VARCHAR(191) NOT NULL, company_name VARCHAR(191) NULL,
    email VARCHAR(191) NULL, phone VARCHAR(80) NULL, message TEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'new',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_inquiries_status (status, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_verification_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, company_id INT NOT NULL, requested_by INT NOT NULL,
    level VARCHAR(80) NOT NULL, documents LONGTEXT NULL, notes TEXT NULL, status VARCHAR(40) NOT NULL DEFAULT 'submitted',
    reviewed_by INT NULL, reviewed_at DATETIME NULL, decision_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_verifications_review (status, level), CONSTRAINT fk_tc_verification_company FOREIGN KEY (company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_verification_account FOREIGN KEY (requested_by) REFERENCES tc_accounts(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_membership_plans (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, plan_key VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL, description TEXT NULL, price_paise INT NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'INR',
    billing_cycle VARCHAR(40) NOT NULL DEFAULT 'monthly', lead_limit INT NULL, product_limit INT NULL, features LONGTEXT NULL,
    sort_order INT NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tc_memberships (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, company_id INT NOT NULL, plan_id INT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending_payment', started_at DATETIME NULL, ends_at DATETIME NULL,
    payment_status VARCHAR(40) NOT NULL DEFAULT 'pending', payment_reference VARCHAR(191) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_memberships_company (company_id, status),
    CONSTRAINT fk_tc_memberships_company FOREIGN KEY (company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_memberships_plan FOREIGN KEY (plan_id) REFERENCES tc_membership_plans(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_payments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, account_id INT NOT NULL,
    company_id INT NULL, membership_id INT NULL, purpose VARCHAR(80) NOT NULL, amount_paise INT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR', provider VARCHAR(40) NOT NULL DEFAULT 'razorpay',
    provider_order_id VARCHAR(191) NULL, provider_payment_id VARCHAR(191) NULL, provider_signature VARCHAR(255) NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'created', payload LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_payments_account (account_id, status), INDEX idx_tc_payments_order (provider_order_id),
    CONSTRAINT fk_tc_payments_account FOREIGN KEY (account_id) REFERENCES tc_accounts(id),
    CONSTRAINT fk_tc_payments_company FOREIGN KEY (company_id) REFERENCES tc_companies(id),
    CONSTRAINT fk_tc_payments_membership FOREIGN KEY (membership_id) REFERENCES tc_memberships(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_content (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, content_type VARCHAR(40) NOT NULL,
    owner_account_id INT NULL, title VARCHAR(191) NOT NULL, slug VARCHAR(191) NOT NULL, summary TEXT NULL, body LONGTEXT NULL,
    image_url VARCHAR(500) NULL, starts_at DATETIME NULL, ends_at DATETIME NULL, location VARCHAR(255) NULL, category VARCHAR(120) NULL,
    company_name VARCHAR(191) NULL, employment_type VARCHAR(80) NULL, application_url VARCHAR(500) NULL,
    placement VARCHAR(120) NULL, target_url VARCHAR(500) NULL, metadata LONGTEXT NULL, status VARCHAR(40) NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at DATETIME NULL,
    UNIQUE KEY uq_tc_content_type_slug (content_type, slug), INDEX idx_tc_content_public (content_type, status, published_at)
  )`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS excerpt TEXT NULL AFTER summary`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS seo_title VARCHAR(191) NULL AFTER target_url`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS seo_description TEXT NULL AFTER seo_title`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(500) NULL AFTER seo_description`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS reading_minutes INT NULL AFTER canonical_url`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS allow_comments TINYINT(1) NOT NULL DEFAULT 1 AFTER reading_minutes`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS featured TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_comments`,
  `ALTER TABLE tc_content ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0 AFTER featured`,
  `CREATE TABLE IF NOT EXISTS tc_blog_categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL, slug VARCHAR(140) NOT NULL UNIQUE, description TEXT NULL,
    color VARCHAR(40) NULL, sort_order INT NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_blog_categories_status (status, sort_order)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_blog_tags (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL, slug VARCHAR(140) NOT NULL UNIQUE, description TEXT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_blog_tags_status (status, name)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_blog_article_tags (
    content_id INT NOT NULL, tag_id INT NOT NULL,
    PRIMARY KEY (content_id, tag_id),
    CONSTRAINT fk_tc_blog_article_tags_content FOREIGN KEY (content_id) REFERENCES tc_content(id),
    CONSTRAINT fk_tc_blog_article_tags_tag FOREIGN KEY (tag_id) REFERENCES tc_blog_tags(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_blog_article_categories (
    content_id INT NOT NULL, category_id INT NOT NULL,
    PRIMARY KEY (content_id, category_id),
    CONSTRAINT fk_tc_blog_article_categories_content FOREIGN KEY (content_id) REFERENCES tc_content(id),
    CONSTRAINT fk_tc_blog_article_categories_category FOREIGN KEY (category_id) REFERENCES tc_blog_categories(id)
  )`,
  `INSERT IGNORE INTO tc_blog_article_categories (content_id, category_id)
   SELECT content.id, category.id
   FROM tc_content content
   INNER JOIN tc_blog_categories category ON category.slug = content.category
   WHERE content.content_type = 'article' AND content.category IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS tc_blog_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    content_id INT NOT NULL, parent_id INT NULL, author_name VARCHAR(140) NOT NULL,
    author_email VARCHAR(191) NULL, author_website VARCHAR(500) NULL, body TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending', ip_address VARCHAR(80) NULL, user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tc_blog_comments_content (content_id, status, created_at),
    INDEX idx_tc_blog_comments_parent (parent_id, status),
    CONSTRAINT fk_tc_blog_comments_content FOREIGN KEY (content_id) REFERENCES tc_content(id),
    CONSTRAINT fk_tc_blog_comments_parent FOREIGN KEY (parent_id) REFERENCES tc_blog_comments(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_media_assets (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    folder VARCHAR(240) NOT NULL, file_name VARCHAR(240) NOT NULL, original_name VARCHAR(240) NOT NULL,
    mime_type VARCHAR(160) NOT NULL, extension VARCHAR(20) NOT NULL, size_bytes INT NOT NULL,
    storage_path VARCHAR(500) NOT NULL, public_url VARCHAR(600) NOT NULL,
    alt_text VARCHAR(240) NULL, caption VARCHAR(500) NULL, tags LONGTEXT NULL, metadata LONGTEXT NULL,
    created_by VARCHAR(191) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at DATETIME NULL,
    INDEX idx_tc_media_folder (folder, created_at), INDEX idx_tc_media_name (original_name)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_frontend_releases (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    channel VARCHAR(80) NOT NULL, name VARCHAR(191) NOT NULL, version INT NOT NULL,
    payload LONGTEXT NOT NULL, checksum CHAR(64) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'draft',
    created_by INT NULL, published_by INT NULL, published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_frontend_release_version (channel, version),
    INDEX idx_tc_frontend_release_active (channel, status, published_at)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_frontend_pages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    page_key VARCHAR(120) NOT NULL UNIQUE, route VARCHAR(191) NOT NULL, title VARCHAR(191) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'active', metadata LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tc_frontend_sections (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    page_id INT NOT NULL, section_key VARCHAR(120) NOT NULL, section_type VARCHAR(80) NOT NULL,
    title VARCHAR(191) NULL, eyebrow VARCHAR(191) NULL, body TEXT NULL, settings LONGTEXT NULL,
    sort_order INT NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_frontend_page_section (page_id, section_key),
    INDEX idx_tc_frontend_sections_order (page_id, status, sort_order),
    CONSTRAINT fk_tc_frontend_sections_page FOREIGN KEY (page_id) REFERENCES tc_frontend_pages(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_frontend_section_items (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    section_id INT NOT NULL, item_key VARCHAR(120) NOT NULL, eyebrow VARCHAR(191) NULL,
    title VARCHAR(255) NOT NULL, summary TEXT NULL, body TEXT NULL, image_url VARCHAR(500) NULL,
    target_url VARCHAR(500) NULL, content LONGTEXT NULL, sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tc_frontend_section_item (section_id, item_key),
    INDEX idx_tc_frontend_items_order (section_id, status, sort_order),
    CONSTRAINT fk_tc_frontend_items_section FOREIGN KEY (section_id) REFERENCES tc_frontend_sections(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_audit_logs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE, actor_type VARCHAR(40) NOT NULL,
    actor_id INT NULL, action VARCHAR(120) NOT NULL, entity_type VARCHAR(80) NOT NULL, entity_id INT NULL,
    old_values LONGTEXT NULL, new_values LONGTEXT NULL, metadata LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_tc_audit_entity (entity_type, entity_id, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS tc_settings (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(120) NOT NULL UNIQUE, setting_value LONGTEXT NOT NULL,
    updated_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
]

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function seedFrontendDesigner(database: Kysely<TirupurConnectDatabaseSchema>) {
  await database.insertInto('tc_frontend_pages').values({
    uuid: generatePublicUuid(),
    page_key: 'home',
    route: '/',
    title: 'Tirupur Connect Home',
    status: 'active',
    metadata: JSON.stringify({ channel: 'public-site' }),
  }).onDuplicateKeyUpdate({
    route: '/',
    title: 'Tirupur Connect Home',
    status: 'active',
  }).execute()

  const page = await database.selectFrom('tc_frontend_pages').select('id').where('page_key', '=', 'home').executeTakeFirstOrThrow()
  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'home-slider',
    section_type: 'slider',
    title: 'Home slider',
    eyebrow: null,
    body: null,
    settings: JSON.stringify({ duration: 6500, bulletPosition: 'content', progressPosition: 'bottom-center' }),
    sort_order: 1,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'slider',
    title: 'Home slider',
    status: 'active',
  }).execute()

  const section = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'home-slider')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultHomeSliderItems.length; index += 1) {
    const item = defaultHomeSliderItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: section.id,
      item_key: item.key,
      eyebrow: item.eyebrow,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: item.image,
      target_url: 'directory',
      content: JSON.stringify(item.content),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'platform-strip',
    section_type: 'logo-marquee',
    title: 'Platform strip',
    eyebrow: null,
    body: null,
    settings: JSON.stringify({ duration: 38, direction: 'left', pauseOnHover: true }),
    sort_order: 2,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'logo-marquee',
    title: 'Platform strip',
    status: 'active',
  }).execute()

  const platformSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'platform-strip')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultPlatformStripItems.length; index += 1) {
    const item = defaultPlatformStripItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: platformSection.id,
      item_key: item.key,
      eyebrow: item.mark,
      title: item.title,
      summary: item.category,
      body: null,
      image_url: item.logo,
      target_url: item.target,
      content: JSON.stringify({ mark: item.mark, category: item.category }),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'why-section',
    section_type: 'image-story',
    title: defaultWhySection.title,
    eyebrow: defaultWhySection.eyebrow,
    body: defaultWhySection.body,
    settings: JSON.stringify({
      label: defaultWhySection.label,
      headline: defaultWhySection.headline,
      image: defaultWhySection.image,
      tone: 'white',
    }),
    sort_order: 3,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'image-story',
    status: 'active',
  }).execute()

  const whySection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'why-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultWhyStoryItems.length; index += 1) {
    const item = defaultWhyStoryItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: whySection.id,
      item_key: item.key,
      eyebrow: item.badge,
      title: item.title,
      summary: item.label,
      body: item.body,
      image_url: item.image,
      target_url: '#why',
      content: JSON.stringify({ tone: item.tone, label: item.label, badge: item.badge }),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'directory-section',
    section_type: 'live-directory',
    title: defaultDirectorySection.title,
    eyebrow: defaultDirectorySection.eyebrow,
    body: defaultDirectorySection.body,
    settings: JSON.stringify({
      tone: 'soft',
      helperTitle: defaultDirectorySection.helperTitle,
      helperBody: defaultDirectorySection.helperBody,
    }),
    sort_order: 4,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'live-directory',
    status: 'active',
  }).execute()

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'profile-section',
    section_type: 'live-profile-showcase',
    title: defaultProfileSection.title,
    eyebrow: defaultProfileSection.eyebrow,
    body: defaultProfileSection.body,
    settings: JSON.stringify({
      tone: 'white',
      helperTitle: defaultProfileSection.helperTitle,
      helperBody: defaultProfileSection.helperBody,
    }),
    sort_order: 5,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'live-profile-showcase',
    status: 'active',
  }).execute()

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'stats-section',
    section_type: 'animated-stats',
    title: defaultStatsSection.title,
    eyebrow: defaultStatsSection.eyebrow,
    body: defaultStatsSection.body,
    settings: JSON.stringify({
      tone: 'blue',
      helperTitle: defaultStatsSection.helperTitle,
      helperBody: defaultStatsSection.helperBody,
    }),
    sort_order: 6,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'animated-stats',
    status: 'active',
  }).execute()

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'ecosystem-section',
    section_type: 'card-grid',
    title: defaultEcosystemSection.title,
    eyebrow: defaultEcosystemSection.eyebrow,
    body: defaultEcosystemSection.body,
    settings: JSON.stringify({ tone: 'green' }),
    sort_order: 7,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'card-grid',
    status: 'active',
  }).execute()

  const ecosystemSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'ecosystem-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultEcosystemItems.length; index += 1) {
    const item = defaultEcosystemItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: ecosystemSection.id,
      item_key: item.key,
      eyebrow: item.eyebrow,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: null,
      target_url: '#marketplace',
      content: JSON.stringify({}),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'marketplace-section',
    section_type: 'card-grid',
    title: defaultMarketplaceSection.title,
    eyebrow: defaultMarketplaceSection.eyebrow,
    body: defaultMarketplaceSection.body,
    settings: JSON.stringify({ tone: 'white' }),
    sort_order: 8,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'card-grid',
    status: 'active',
  }).execute()

  const marketplaceSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'marketplace-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultMarketplaceItems.length; index += 1) {
    const item = defaultMarketplaceItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: marketplaceSection.id,
      item_key: item.key,
      eyebrow: item.eyebrow,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: null,
      target_url: '#marketplace-store',
      content: JSON.stringify({}),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'rfq-section',
    section_type: 'rfq-flow',
    title: defaultRfqSection.title,
    eyebrow: defaultRfqSection.eyebrow,
    body: defaultRfqSection.body,
    settings: JSON.stringify({ tone: 'white' }),
    sort_order: 9,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'rfq-flow',
    status: 'active',
  }).execute()

  const rfqSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'rfq-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultRfqItems.length; index += 1) {
    const item = defaultRfqItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: rfqSection.id,
      item_key: item.key,
      eyebrow: item.label,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: null,
      target_url: '#rfq',
      content: JSON.stringify({ icon: item.icon, tone: item.tone }),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'broadcast-section',
    section_type: 'broadcast-flow',
    title: defaultBroadcastSection.title,
    eyebrow: defaultBroadcastSection.eyebrow,
    body: defaultBroadcastSection.body,
    settings: JSON.stringify({ tone: 'soft' }),
    sort_order: 10,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'broadcast-flow',
    status: 'active',
  }).execute()

  const broadcastSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'broadcast-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultBroadcastItems.length; index += 1) {
    const item = defaultBroadcastItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: broadcastSection.id,
      item_key: item.key,
      eyebrow: item.label,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: null,
      target_url: '#broadcast',
      content: JSON.stringify({ icon: item.icon, tone: item.tone }),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'capacity-section',
    section_type: 'image-story',
    title: defaultCapacitySection.title,
    eyebrow: defaultCapacitySection.eyebrow,
    body: defaultCapacitySection.body,
    settings: JSON.stringify({
      image: defaultCapacitySection.image,
      items: defaultCapacitySection.items,
      label: defaultCapacitySection.label,
      reverse: true,
      storyTitle: defaultCapacitySection.storyTitle,
      tone: 'blue',
    }),
    sort_order: 11,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'image-story',
    status: 'active',
  }).execute()

  await database.insertInto('tc_frontend_sections').values({
    uuid: generatePublicUuid(),
    page_id: page.id,
    section_key: 'networking-section',
    section_type: 'card-grid',
    title: defaultNetworkingSection.title,
    eyebrow: defaultNetworkingSection.eyebrow,
    body: defaultNetworkingSection.body,
    settings: JSON.stringify({ tone: 'green' }),
    sort_order: 12,
    status: 'active',
  }).onDuplicateKeyUpdate({
    section_type: 'card-grid',
    status: 'active',
  }).execute()

  const networkingSection = await database.selectFrom('tc_frontend_sections').select('id')
    .where('page_id', '=', page.id)
    .where('section_key', '=', 'networking-section')
    .executeTakeFirstOrThrow()
  for (let index = 0; index < defaultNetworkingItems.length; index += 1) {
    const item = defaultNetworkingItems[index]
    await database.insertInto('tc_frontend_section_items').values({
      uuid: generatePublicUuid(),
      section_id: networkingSection.id,
      item_key: item.key,
      eyebrow: item.eyebrow,
      title: item.title,
      summary: null,
      body: item.body,
      image_url: null,
      target_url: '#networking',
      content: JSON.stringify({}),
      sort_order: index + 1,
      status: 'active',
    }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
  }

  for (const section of remainingFrontendSections) {
    await database.insertInto('tc_frontend_sections').values({
      uuid: generatePublicUuid(),
      page_id: page.id,
      section_key: section.key,
      section_type: section.type,
      title: section.title,
      eyebrow: section.eyebrow,
      body: section.body,
      settings: JSON.stringify({ tone: section.tone }),
      sort_order: section.order,
      status: 'active',
    }).onDuplicateKeyUpdate({
      section_type: section.type,
      status: 'active',
    }).execute()

    if (!section.items?.length) continue
    const seededSection = await database.selectFrom('tc_frontend_sections').select('id')
      .where('page_id', '=', page.id)
      .where('section_key', '=', section.key)
      .executeTakeFirstOrThrow()
    for (let index = 0; index < section.items.length; index += 1) {
      const item = section.items[index]
      await database.insertInto('tc_frontend_section_items').values({
        uuid: generatePublicUuid(),
        section_id: seededSection.id,
        item_key: item.key,
        eyebrow: item.eyebrow,
        title: item.title,
        summary: null,
        body: item.body,
        image_url: null,
        target_url: section.target,
        content: JSON.stringify({}),
        sort_order: index + 1,
        status: 'active',
      }).onDuplicateKeyUpdate({ item_key: item.key }).execute()
    }
  }

  for (let index = 0; index < defaultBlogCategories.length; index += 1) {
    const [name, slug, description, color] = defaultBlogCategories[index]
    await sql`
      INSERT INTO tc_blog_categories (uuid,name,slug,description,color,sort_order,status)
      VALUES (${generatePublicUuid()},${name},${slug},${description},${color},${index + 1},'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), color=VALUES(color), sort_order=VALUES(sort_order), status='active'
    `.execute(database)
  }
  for (const name of defaultBlogTags) {
    await sql`
      INSERT INTO tc_blog_tags (uuid,name,slug,status)
      VALUES (${generatePublicUuid()},${name},${slugify(name)},'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name), status='active'
    `.execute(database)
  }
}

function platformBrand(key: string, mark: string, title: string, category: string, logo: string | null = null) {
  return { key, mark, title, category, logo, target: '#associations' }
}

function whyStory(key: string, badge: string, title: string, body: string, image: string, tone: 'blue' | 'emerald' | 'orange' | 'violet') {
  return { key, badge, label: badge, title, body, image, tone }
}

function ecosystemCard(key: string, eyebrow: string, title: string, body: string) {
  return { key, eyebrow, title, body }
}

function rfqCard(key: string, label: string, title: string, body: string, icon: string, tone: 'blue' | 'emerald' | 'orange' | 'violet') {
  return { key, label, title, body, icon, tone }
}

function sectionSeed(
  key: string,
  type: string,
  eyebrow: string,
  title: string,
  body: string,
  tone: 'white' | 'soft' | 'blue' | 'green',
  order: number,
  target: string,
  items: Array<ReturnType<typeof ecosystemCard>> = [],
) {
  return { key, type, eyebrow, title, body, tone, order, target, items }
}

function slider(
  key: string,
  eyebrow: string,
  title: string,
  body: string,
  image: string,
  cardEyebrow: string,
  cardTitle: string,
  cardBody: string,
  insights: readonly (readonly [string, string, string])[],
  imagePosition = 'center',
) {
  const tones = ['blue', 'emerald', 'orange', 'violet']
  return {
    key,
    eyebrow,
    title,
    body,
    image,
    content: {
      imagePosition,
      actions: [
        { label: 'Explore directory', target: 'directory', variant: 'primary' },
        { label: 'Post requirement', target: 'rfq', variant: 'ghost' },
      ],
      card: { eyebrow: cardEyebrow, title: cardTitle, body: cardBody },
      insights: insights.map(([icon, label, value], index) => ({ icon, label, value, tone: tones[index] })),
    },
  }
}
