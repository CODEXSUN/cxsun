export type TConnectStatus = 'active' | 'draft' | 'paused'

export interface TConnectSettings {
  status: TConnectStatus
  platformName: string
  tagline: string
  positioning: string
}

export interface TConnectOverview {
  settings: TConnectSettings
  mode: 'marketplace' | 'client'
  counts: {
    buyers: number
    events: number
    messages: number
    news: number
    products: number
    rfqs: number
    suppliers: number
  }
}

export interface TConnectSupplierProfile {
  id: number
  uuid: string
  contactId: number
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
  verificationLevel: string
  publicationStatus: string
  publishedAt: string | null
  status: string
  createdAt: string
}

export interface TConnectSupplierProfileInput {
  contactId?: number | string
  brandName?: string
  businessType?: string
  about?: string
  factoryAddress?: string
  monthlyCapacity?: string
  minOrderQty?: number | string
  status?: string
}

export interface TConnectBuyerCompany {
  id: number
  uuid: string
  contactId: number
  buyerType: string | null
  annualVolume: string | null
  description: string | null
  status: string
  createdAt: string
}

export interface TConnectBuyerCompanyInput {
  contactId?: number | string
  buyerType?: string
  annualVolume?: string
  description?: string
  status?: string
}

export interface TConnectProduct {
  id: number
  uuid: string
  productId: number
  supplierProfileId: number
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
  publicationStatus: string
  publishedAt: string | null
  status: string
  createdAt: string
}

export interface TConnectProductInput {
  productId?: number | string
  supplierProfileId?: number | string
  slug?: string
  description?: string
  moq?: number | string
  leadTime?: string
  fabricDetails?: string
  certificationDetails?: string
  status?: string
}

export interface TConnectRfq {
  id: number
  uuid: string
  buyerCompanyId: number
  title: string
  description: string | null
  quantity: number
  deliveryDeadline: string | null
  budgetMin: number | null
  budgetMax: number | null
  status: string
  createdAt: string
}

export interface TConnectRfqInput {
  buyerCompanyId?: number | string
  title?: string
  description?: string
  quantity?: number | string
  deliveryDeadline?: string
  budgetMin?: number | string
  budgetMax?: number | string
  status?: string
}

export interface TConnectPublicRfq {
  id: number
  uuid: string
  title: string
  description: string | null
  quantity: number
  deliveryDeadline: string | null
  budgetMin: number | null
  budgetMax: number | null
  status: string
  createdAt: string
}

export interface TConnectPublicInquiryInput {
  entityType?: string
  entityUuid?: string
  sourceTenantSlug?: string
  buyerName?: string
  companyName?: string
  email?: string
  phone?: string
  message?: string
}

export interface TConnectSupplierPublication {
  id: number
  uuid: string
  sourceTenantId: number
  sourceTenantSlug: string
  sourceSupplierUuid: string
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
  publicationStatus: string
  createdAt: string
  reviewedAt: string | null
}

export interface TConnectSupplierPublicationDetail extends TConnectSupplierPublication {
  about: string | null
  factoryAddress: string | null
  verificationLevel: string
}

export interface TConnectProductPublication {
  id: number
  uuid: string
  sourceTenantId: number
  sourceTenantSlug: string
  sourceProductUuid: string
  sourceSupplierUuid: string | null
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
  publicationStatus: string
  createdAt: string
  reviewedAt: string | null
}

export interface TConnectProductPublicationDetail extends TConnectProductPublication {
  fabricDetails: string | null
  certificationDetails: string | null
}
