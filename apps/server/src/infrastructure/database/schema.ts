import type { Generated } from 'kysely'

export interface SitePagesTable {
  id: Generated<number>
  slug: string
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
  sort_order: number
}

export interface SiteServicesTable {
  id: Generated<number>
  title: string
  description: string
  sort_order: number
}

export interface SitePostsTable {
  id: Generated<number>
  title: string
  excerpt: string
  published_at: string
  sort_order: number
}

export interface SiteMessagesTable {
  id: Generated<number>
  name: string
  email: string
  message: string
  created_at: Generated<string>
}

export interface DatabaseSchema {
  site_pages: SitePagesTable
  site_services: SiteServicesTable
  site_posts: SitePostsTable
  site_messages: SiteMessagesTable
}
