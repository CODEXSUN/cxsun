export type TirupurConnectAccountRole =
  | 'buyer'
  | 'supplier'
  | 'supplier-staff'
  | 'association'
  | 'advertiser'
  | 'event-organizer'
  | 'candidate'
  | 'content-editor'
  | 'verifier'
  | 'marketplace-admin'

export type TirupurConnectSourceType = 'web' | 'billing_connector'
export type TirupurConnectPublicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'suspended'
  | 'archived'

export interface MarketplaceIdentity {
  accountId: number
  accountUuid: string
  email: string
  role: TirupurConnectAccountRole
  companyId: number | null
}

export interface RegisterAccountInput {
  name?: string
  email?: string
  password?: string
  role?: TirupurConnectAccountRole
  phone?: string
  companyName?: string
}

export interface LoginAccountInput {
  email?: string
  password?: string
}

export interface CompanyInput {
  name?: string
  legalName?: string
  slug?: string
  description?: string
  businessType?: string
  gstin?: string
  iecNumber?: string
  email?: string
  phone?: string
  whatsapp?: string
  contactPersonName?: string
  contactPersonDesignation?: string
  contactPersonEmail?: string
  contactPersonPhone?: string
  contactPersonWhatsapp?: string
  website?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  latitude?: number | string
  longitude?: number | string
  yearEstablished?: number | string
  employeeCount?: number | string
  factorySize?: string
  monthlyCapacity?: string
  minimumOrderQuantity?: number | string
  leadTime?: string
  exportMarkets?: string[]
  certifications?: string[]
  socialLinks?: Record<string, string>
  logoUrl?: string
  coverUrl?: string
  categoryUuids?: string[]
}

export interface ProductInput {
  uuid?: string
  name?: string
  slug?: string
  description?: string
  categoryUuid?: string
  sku?: string
  unit?: string
  priceFrom?: number | string
  currency?: string
  moq?: number | string
  leadTime?: string
  fabricDetails?: string
  sizes?: string[]
  colours?: string[]
  certifications?: string[]
  media?: Array<{ url: string; type?: string; alt?: string }>
  status?: string
}

export interface RfqInput {
  uuid?: string
  title?: string
  description?: string
  categoryUuid?: string
  quantity?: number | string
  unit?: string
  targetPrice?: number | string
  currency?: string
  deliveryDate?: string
  deliveryLocation?: string
  certifications?: string[]
  attachments?: Array<{ url: string; name?: string }>
  privacy?: 'public' | 'matched' | 'private'
}

export interface QuoteInput {
  pricePerUnit?: number | string
  totalAmount?: number | string
  currency?: string
  quantity?: number | string
  leadTime?: string
  validityDate?: string
  notes?: string
  attachments?: Array<{ url: string; name?: string }>
}

export interface VerificationRequestInput {
  level?: string
  notes?: string
  documents?: Array<{ type: string; url: string; number?: string; expiresAt?: string }>
}

export interface InquiryInput {
  companyUuid?: string
  productUuid?: string
  rfqUuid?: string
  name?: string
  companyName?: string
  email?: string
  phone?: string
  message?: string
}

export interface ContentInput {
  uuid?: string
  title?: string
  slug?: string
  summary?: string
  excerpt?: string
  body?: string
  imageUrl?: string
  startsAt?: string
  endsAt?: string
  location?: string
  category?: string
  categories?: string[] | string
  companyName?: string
  employmentType?: string
  applicationUrl?: string
  placement?: string
  targetUrl?: string
  seoTitle?: string
  seoDescription?: string
  canonicalUrl?: string
  readingMinutes?: number | string
  allowComments?: boolean | string
  featured?: boolean | string
  tags?: string[] | string
  status?: string
  metadata?: Record<string, unknown>
}

export interface BlogTaxonomyInput {
  uuid?: string
  name?: string
  slug?: string
  description?: string
  color?: string
  sortOrder?: number | string
  status?: string
}

export interface BlogCommentInput {
  articleUuid?: string
  parentUuid?: string
  authorName?: string
  authorEmail?: string
  authorWebsite?: string
  body?: string
}

export type FrontendContentChannel = 'public-site' | 'client-portal' | 'admin-site'

export interface FrontendReleaseInput {
  channel?: FrontendContentChannel
  name?: string
  payload?: Record<string, unknown>
}

export interface FrontendSectionInput {
  uuid?: string
  pageKey?: string
  sectionKey?: string
  sectionType?: string
  title?: string
  eyebrow?: string
  body?: string
  settings?: Record<string, unknown>
  sortOrder?: number | string
  status?: string
}

export interface FrontendSectionItemInput {
  uuid?: string
  sectionUuid?: string
  itemKey?: string
  eyebrow?: string
  title?: string
  summary?: string
  body?: string
  imageUrl?: string
  targetUrl?: string
  content?: Record<string, unknown>
  sortOrder?: number | string
  status?: string
}

export interface ConnectorSubmissionInput {
  sourceTenantId?: number | string
  sourceTenantSlug?: string
  externalRecordUuid?: string
  entityType?: 'company' | 'product' | 'capacity' | 'certificate' | 'offer'
  syncVersion?: number | string
  payload?: Record<string, unknown>
}

export interface ReviewDecisionInput {
  status?: 'under_review' | 'changes_requested' | 'approved' | 'published' | 'suspended' | 'archived'
  notes?: string
}

export interface ListQuery {
  search?: string
  category?: string
  city?: string
  status?: string
  sourceType?: string
  privacy?: string
  surface?: string
  page?: number | string
  limit?: number | string
}
