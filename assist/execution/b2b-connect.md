# B2B Connect - Product Plan

> **Architecture authority:** The user-facing product is Tirupur Connect. `assist/context/tirupur-connect-boundary.md` is canonical. TConnect is the billing connector only; Tirupur Connect owns the standalone marketplace. Older central-tenant or mixed-module statements in this plan are migration context, not the target architecture.

## Purpose

B2B Connect is the Tirupur textile and garment business network for suppliers, manufacturers, buyers, exporters, job work providers, service providers, and industry partners.

The product must become more than a listing directory. The revenue engine is:

- verified trust
- buyer requirements and RFQs
- lead access
- premium visibility
- daily business opportunities
- membership and advertisement revenue

The reference direction is IndiaMART/Justdial-style discovery plus Locofast-style textile sourcing discipline: verified suppliers, transparent MOQ/pricing signals, RFQ/quote flow, assisted sourcing, quick supplier matching, and buyer/seller mobile engagement.

## Application Boundary

Tirupur Connect stays inside the current CXSun monorepo and server runtime but is independent from billing tenants:

- `apps/b2b-connect`: public website and buyer/supplier member portal on port `6032` and domain `tirupurconnect.com`.
- `apps/b2b-connect-admin`: dedicated marketplace staff back office.
- `apps/server/src/modules/tirupur-connect`: central marketplace engine.
- `apps/server/src/modules/tconnect`: billing-to-marketplace connector only.

Do not duplicate shared master/transaction logic. B2B Connect must reuse:

- Auth and SSO from existing login/session.
- Tenant and app access from subscription/app registry.
- Contacts from `masters_contacts`.
- Products from existing product master where the seller is an existing tenant.
- Common masters for location, category, unit, currency, tax, etc.
- Billing for membership invoices, advertisement invoices, event tickets, and paid verification.
- Accounts for voucher posting through billing/accounting services.
- CRM for lead lifecycle where a lead becomes sales follow-up.
- Mail/notification service for RFQ alerts, verification results, quote updates, and subscription reminders.
- Media/files for logos, certificates, gallery images, videos, resumes, proposals, and banners.

## Naming Rule

Use `Tirupur Connect` in user-facing UI. Use `tconnect` only for the billing connector and `tirupur-connect` for the central marketplace backend boundary.

## Existing Foundation To Migrate Carefully

The repo already has:

- Client-side source tables for supplier/product publication.
- Central-tenant marketplace RFQs, leads/messages, membership, events, news, and analytics concepts that must move to tenant-independent marketplace persistence.
- Public supplier/product/RFQ read APIs.
- Supplier and product publication review queues.
- Activity and audit tables.
- Membership plan seed basics.
- Dashboard menu entry for TConnect.

Target boundary:

```text
Client tenant
  owns its source contact, product, supplier profile draft
  uses TConnect to submit immutable revisions

Central Tirupur Connect platform
  owns public directory, buyer RFQs, leads, quotes, messages, memberships,
  advertisements, events, jobs, news, analytics, verification workflow
```

## Product Positioning

B2B Connect should be the Tamil Nadu textile business network, starting with Tirupur.

Primary value promises:

- Find verified textile and garment suppliers quickly.
- Post requirements and receive matched supplier quotes.
- Build trust through verification badges.
- Get daily business opportunities through WhatsApp, app notification, and email.
- Give suppliers measurable visibility and lead access.

Locofast-inspired concepts to adapt:

- Separate buyer and seller journeys.
- Fabric and garment requirement posting.
- Supplier quote comparison.
- MOQ, capacity, lead time, delivery, and certification clarity.
- Verified supplier network.
- Assisted sourcing for premium buyers.
- Order/status visibility later, after RFQ and quotation flow is stable.

## Target Business Categories

Initial categories:

- Fabric Suppliers
- Yarn Suppliers
- Knitting Units
- Dyeing Units
- Printing Units
- Embroidery Units
- Washing Units
- Packing Units
- Garment Manufacturers
- Exporters
- Buying Houses
- Logistics Providers
- Machinery Suppliers
- Labels & Accessories Suppliers
- Textile Consultants
- Software Providers
- Job Work Providers

Category model:

- `category`: broad business category.
- `subcategory`: specific service/product capability.
- `tags`: searchable capabilities such as cotton, organic, GOTS, kidswear, polo, reactive dyeing, compacting, rotary printing.

Use existing common/product category masters where appropriate, but B2B-specific discovery hierarchy can live in `tc_categories` or `tc_business_categories` if the current product category master is not enough.

## Menu Structure

Main B2B Connect workspace:

```text
Dashboard
Companies
Categories
Premium Listings
Leads/RFQ
Advertisements
Membership Plans
Events
Jobs
News & Updates
Verification Center
Reports
Admin Settings
```

Role-specific menus:

Buyer:

```text
Dashboard
Post RFQ
My RFQs
Quotes Received
Saved Companies
Messages
Notifications
```

Supplier:

```text
Dashboard
Company Profile
Products & Services
Incoming RFQs
My Quotations
Leads
Membership
Verification
Analytics
Messages
```

Admin:

```text
Dashboard
Companies
Approvals
Verification Center
RFQ Monitor
Leads
Memberships
Advertisements
Events
Jobs
News
Reports
Settings
Audit Logs
```

## Core Modules

### 1. Directory Listing

Use a searchable public directory and admin/private management surfaces.

Company profile fields:

- company name
- owner name
- contact person
- mobile number
- WhatsApp number
- email
- website
- GST number
- IEC number
- business category
- subcategory
- address
- city
- state
- pincode
- Google map location
- company description
- factory capacity
- number of employees
- year established
- export markets
- products
- certifications
- social media links
- profile image
- gallery images
- video URL

Implementation boundary:

- If company belongs to a tenant, base identity should link to existing Contact/Company/Product records.
- If public submitted company is not a tenant yet, create a B2B lead/listing record first, then convert to tenant/contact after onboarding.
- GST/IEC fields belong in B2B profile or verification extension, not in the generic contact table unless the master already supports it.

Search/filter:

- keyword
- category
- subcategory
- product/service
- location
- exporter
- verified status
- membership tier
- capacity/MOQ/lead time
- sort newest, premium, popular, verified, near location

### 2. Company Profile Page

Public profile should include:

- logo
- banner
- overview
- verification badge
- business category chips
- products/services
- gallery
- certifications
- contact actions
- WhatsApp button
- call button
- email button
- map
- send inquiry
- request quote
- save company
- share company
- report listing
- QR profile link

Contact gate:

- Free visitors can see limited contact details.
- Paid members or lead-credit users can unlock verified buyer/supplier contact details depending on business rules.
- Every contact reveal must create a lead/audit event.

### 3. Verified Supplier Program

Verification levels:

- Basic Verified
- GST Verified
- IEC Verified
- Factory Verified
- Premium Verified
- Export Verified

Verification documents:

- GST certificate
- IEC certificate
- factory photos
- business registration
- export proof/certification documents
- optional trade association membership proof

Workflow:

```text
supplier uploads document
system validates required fields
admin reviews
admin approves/rejects/asks correction
badge updates
audit log records every action
notification sent
```

Verification can become revenue:

- paid annual verification
- factory visit package
- export verification package
- badge renewal reminders

### 4. Leads And RFQ System

Buyer can post:

- product requirement
- category/subcategory
- fabric/product details
- quantity and unit
- target price
- delivery date
- delivery location
- certification requirements
- attachment/spec sheet
- privacy setting

Supplier can:

- view allowed RFQs
- submit quotation
- upload proposal
- chat with buyer
- request clarification
- mark not interested

Admin can:

- moderate RFQs
- assign matching suppliers
- mark spam/duplicate
- monitor quotes
- promote urgent requirements

RFQ statuses:

- open
- under_review
- matched
- quoted
- negotiation
- closed
- cancelled
- expired

Lead access model:

- Free: limited monthly leads.
- Paid plans: more or unlimited leads.
- Contact reveal and quote submit should debit lead credits where required.
- WhatsApp/app/email alerts should be plan-aware.

### 5. Membership Plans

Plans:

Free:

- basic listing
- one product/service
- limited visibility
- limited lead access

Silver:

- priority listing
- 10 products/services
- lead access
- basic analytics

Gold:

- top placement
- unlimited products/services
- higher lead access
- verification badge
- RFQ alerts

Platinum:

- homepage/category placement
- featured listing
- premium badge
- dedicated support
- assisted sourcing priority
- advanced analytics

Pricing starting point:

- Free: 5 leads/month
- Silver: Rs 999/month
- Gold: Rs 2,999/month
- Platinum: Rs 9,999/month

Billing integration:

- Membership purchase creates billing invoice through BillingService.
- Payment status updates membership entitlement.
- Accounts posting happens via billing/accounting engine, not direct B2B tables.

### 6. Advertisement System

Ad placements:

- homepage banner
- category banner
- sidebar banner
- popup/banner modal
- sponsored company card
- sponsored RFQ slot
- newsletter/WhatsApp sponsor later

Advertiser dashboard:

- views
- clicks
- leads generated
- spend
- start/end date
- expiry status
- creative preview

Billing:

- Advertisement booking invoices should use billing module.
- Click/view counters should be programmatic analytics tables, not manual edits.

### 7. Business Networking

Networking should be phase 2 after directory/RFQ are stable.

Features:

- follow companies
- connect with businesses
- messages
- business posts
- likes
- comments
- shares
- update feed

Boundary:

- Reuse CRM/contact identity where possible.
- Use B2B-specific social tables for posts/follows/comments.
- Add moderation and report abuse before public posting.

### 8. Events And Exhibitions

Features:

- textile exhibitions
- trade shows
- association meetings
- training programs
- event registration
- ticket booking
- QR attendance

Integration:

- ticket/registration payment through billing/payment flow
- QR check-in audit log
- event leads can sync to CRM

### 9. Job Portal

Employers can post:

- merchandiser jobs
- production jobs
- designer jobs
- accounts jobs
- export documentation jobs
- job work/operator roles

Candidates can:

- create profile
- upload resume
- apply online
- track applications

Boundary:

- Job candidates may not be tenant users.
- Store candidate profile separately from tenant auth until account creation is needed.
- Uploaded resumes go through media/files service.

### 10. News And Industry Updates

Categories:

- textile news
- export news
- government schemes
- GST updates
- trade policies
- association updates
- buyer opportunities

Boundary:

- Reuse Blog/Sites content engine when possible.
- B2B Connect can have category/channel metadata and app-specific publishing rules.

### 11. Mobile App Features

Mobile features:

- push notifications
- WhatsApp sharing
- instant inquiry
- saved companies
- saved RFQs
- RFQ alerts
- quote updates
- verification status
- membership expiry reminders

Use shared APIs. Do not create separate business logic for mobile.

### 12. Admin Panel

Admin must manage:

- companies
- approvals
- verification
- memberships
- advertisements
- RFQs
- quotes
- events
- jobs
- news
- analytics
- audit logs
- abuse reports
- settings

Admin actions must audit:

- approve/reject listing
- approve/reject verification
- feature/unfeature listing
- suspend listing
- reveal contact override
- RFQ moderation
- plan changes
- ad approvals

## Analytics

Dashboard metrics:

- total companies
- verified companies
- premium members
- monthly leads
- RFQs created
- quotes submitted
- contact reveals
- WhatsApp clicks
- revenue
- top categories
- most viewed companies
- conversion by plan
- ad impressions/clicks/leads

Use rollup tables for live dashboards:

- daily company stats
- daily RFQ stats
- lead/reveal counters
- ad counters
- membership revenue summary

Avoid recomputing every dashboard from raw logs on every page load.

## Database Direction

Do not create duplicate tables for existing core masters.

Reuse:

- users/session/roles from auth
- contacts from master
- products from product master
- locations from common
- currency/unit/category where suitable
- files/media from media/files
- invoices/payments/accounting via billing/accounts

B2B-specific tables to add or expand:

- `tc_company_profiles`
- `tc_business_categories`
- `tc_company_category_links`
- `tc_profile_products`
- `tc_profile_media`
- `tc_verification_requests`
- `tc_verification_documents`
- `tc_rfqs`
- `tc_rfq_items`
- `tc_rfq_matches`
- `tc_rfq_quotes`
- `tc_quote_attachments`
- `tc_leads`
- `tc_contact_reveals`
- `tc_membership_plans`
- `tc_memberships`
- `tc_lead_credits`
- `tc_ad_campaigns`
- `tc_ad_creatives`
- `tc_ad_events`
- `tc_follows`
- `tc_connections`
- `tc_messages`
- `tc_posts`
- `tc_post_comments`
- `tc_events`
- `tc_event_registrations`
- `tc_event_attendance`
- `tc_jobs`
- `tc_job_applications`
- `tc_news_channels`
- `tc_analytics_daily`
- `tc_audit_history`

Every table needs:

- tenant_id
- company_id where relevant
- uuid
- created_by/updated_by/deleted_by
- created_at/updated_at/deleted_at
- indexes for tenant/status/date/search

For 100,000+ businesses:

- add normalized search columns
- add full-text indexes where MySQL/MariaDB supports it
- add slug indexes
- add category/location/status composite indexes
- keep analytics rollups
- plan OpenSearch/Meilisearch later if DB search becomes slow

## API Surface

Public APIs:

```text
GET  /api/v1/tconnect/public/companies
GET  /api/v1/tconnect/public/companies/:slug
GET  /api/v1/tconnect/public/categories
GET  /api/v1/tconnect/public/rfqs
POST /api/v1/tconnect/public/inquiries
POST /api/v1/tconnect/public/rfqs
GET  /api/v1/tconnect/public/events
GET  /api/v1/tconnect/public/news
```

Authenticated supplier/buyer APIs:

```text
GET/PUT /api/v1/tconnect/profile
GET/POST /api/v1/tconnect/products
GET/POST /api/v1/tconnect/rfqs
POST /api/v1/tconnect/rfqs/:id/quotes
GET /api/v1/tconnect/leads
POST /api/v1/tconnect/contact-reveals
GET/POST /api/v1/tconnect/messages
GET /api/v1/tconnect/membership
POST /api/v1/tconnect/verification-requests
```

Admin APIs:

```text
GET /api/v1/tconnect/admin/dashboard
GET /api/v1/tconnect/admin/companies
PATCH /api/v1/tconnect/admin/companies/:id/status
GET /api/v1/tconnect/admin/verifications
PATCH /api/v1/tconnect/admin/verifications/:id/decision
GET /api/v1/tconnect/admin/rfqs
GET /api/v1/tconnect/admin/memberships
GET /api/v1/tconnect/admin/ads
GET /api/v1/tconnect/admin/reports
GET /api/v1/tconnect/admin/audit
```

## Role-Based Access

Roles:

- public visitor
- buyer
- supplier
- supplier staff
- advertiser
- event organizer
- candidate
- content editor
- verifier
- B2B admin
- super admin

Permission examples:

- Public can search and send limited inquiry.
- Buyer can post RFQ and view own quotes.
- Supplier can manage own profile/products and quote eligible RFQs.
- Paid supplier can reveal buyer contact according to plan.
- Verifier can review documents but not change membership billing.
- Admin can approve/suspend/list/feature, but all actions are audited.
- Super admin can configure plans, pricing, and platform settings.

## UI Design Direction

Public app:

- fast search-first home
- category browse
- city/category landing pages
- supplier cards with badges, MOQ, capacity, location, response speed
- prominent WhatsApp/request quote actions
- RFQ CTA above the fold
- featured/premium sections
- industry news and events below transactional blocks

Private app:

- quiet operational dashboard
- clear list/show/upsert pattern like existing Sales/Receipt pages
- filters, columns, refresh, row actions
- no marketing hero inside admin surfaces

Mobile:

- search
- saved companies
- RFQ posting
- lead alerts
- WhatsApp CTA
- profile completion

## Revenue Model

Revenue streams:

- membership plans
- lead credits/contact reveal packs
- paid verification badges
- factory verification packages
- featured listing placements
- advertisement banners
- event tickets/sponsorship
- job posting fees
- assisted sourcing fee
- future transaction/service fee

Year targets:

- Year 1: 2,000 companies, 100 paid subscribers, Rs 10-15 lakh revenue
- Year 2: 5,000 companies, 500 paid subscribers, Rs 50 lakh+ revenue
- Year 3: expand to Coimbatore, Erode, Karur, and broader Tamil Nadu textile network

## Deployment Architecture

Current preferred shape:

```text
tirupurconnect.com -> apps/b2b-connect frontend
main app 6010/prod tenant app -> private B2B admin/supplier workspace
apps/server -> one API/backend
tconnect central tenant DB -> marketplace-owned records
client tenant DBs -> source supplier/product records
```

Production:

- same backend core
- domain routing through existing tenant/domain mapping
- CDN/cache for public directory pages later
- queue for notifications, matching, analytics rollup, search indexing

## Security Best Practices

- Never expose buyer contact until permission/plan rules pass.
- Rate-limit public inquiry and RFQ forms.
- OTP/email verification before publishing high-value RFQs.
- Audit all admin actions.
- Store documents in private media with signed access where required.
- Moderate public posts, jobs, ads, and news.
- Add report listing/report user workflow.
- Avoid direct mutation of billing/accounting from B2B module.
- Use tenant context on every private API.
- Add row-level ownership checks for buyer/supplier records.

## Implementation Phases

### Phase 1 - Clean Foundation

- Rename user-facing copy to B2B Connect while keeping internal `tconnect` stable.
- Expand dashboard menu to the requested structure.
- Confirm central tenant boundary.
- Write gap map between existing tables and this plan.
- Add category seed for Tirupur textile/garment business types.

### Phase 2 - Directory MVP

- Company profile upsert linked to contact.
- Public company directory with search/filter/sort.
- Company detail page with WhatsApp/call/email/request quote/save/share/report.
- Admin approve/suspend/listing review.
- Profile media/gallery using media service.

### Phase 3 - RFQ/Lead Revenue MVP

- Public/private RFQ creation.
- Supplier matching by category/location/capability.
- Supplier quote submit.
- Lead credits/contact reveal rules.
- WhatsApp/email/app notification hooks.
- Buyer/supplier RFQ dashboards.

### Phase 4 - Membership And Verification

- Free/Silver/Gold/Platinum plan management.
- Billing invoice integration for memberships.
- Verification request upload/review workflow.
- Verification badges and expiry.
- Lead limits and premium listing ranking.

### Phase 5 - Ads, Events, Jobs, News

- Advertisement placements and analytics.
- Event registration and QR attendance.
- Job portal and applications.
- News/content publishing using Blog/Sites engine where possible.

### Phase 6 - Analytics And Scale

- Dashboard rollups.
- Search optimization.
- Abuse/spam controls.
- AI-powered textile assistant for premium search and supplier matching.
- City expansion model: Tirupur, Coimbatore, Erode, Karur.

## First Engineering Task

Before coding features, create a gap document against current `apps/server/src/modules/tconnect` and frontend menu/pages:

```text
assist/execution/b2b-connect-gap.md
```

It should answer:

- which requested modules already exist partially
- which tables need expansion
- which APIs can be reused
- which pages are missing
- which fields should link to existing masters
- which parts must use Billing/Accounts/CRM/Mail/Media services

Then implement Phase 1 menu/copy/category cleanup.
