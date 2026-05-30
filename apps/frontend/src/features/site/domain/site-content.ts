export interface SitePage {
  slug: string
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
}

export interface SiteService {
  id: number
  title: string
  description: string
}

export interface SitePost {
  id: number
  title: string
  excerpt: string
  published_at: string
}

export interface SiteContent {
  pages: SitePage[]
  services: SiteService[]
  posts: SitePost[]
}

export interface TenantStaticSiteContent extends SiteContent {
  ok: boolean
  mode: 'tenant'
  resolved: boolean
  error?: string
  tenant: {
    id: number
    code: number
    slug: string
    name: string
    status: string
    industryKey?: string | null
    industryName?: string | null
    features: string[]
  } | null
  domain: {
    id: number
    domain: string
    label: string
    isPrimary: boolean
    status: string
  } | null
  apps: {
    enabled: string[]
    landing: string
  } | null
  sliders?: Array<SliderPayload & {
    id: number
    uuid: string
    name: string
    slug: string
    placement: string
    status: string
    sort_order: number
  }>
}

export interface HealthStatus {
  status: 'ok'
  version: string
}

export type PublicSiteRoute = {
  page: string
  view: 'landing'
}
import type { SliderPayload } from "src/components/blocks/slider/slider.types"
