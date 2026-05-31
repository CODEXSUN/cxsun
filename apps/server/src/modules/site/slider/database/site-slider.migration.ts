import { sql, type Kysely } from 'kysely'
import type { Tenant } from '../../../../core/tenant/domain/tenant.types.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateSiteSliderTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS site_sliders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      placement VARCHAR(120) NOT NULL DEFAULT 'home-slider',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      options_json JSON NOT NULL,
      slides_json JSON NOT NULL,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_site_sliders_slug (tenant_id, slug),
      INDEX idx_site_sliders_placement (tenant_id, placement, status, sort_order)
    )
  `).execute(database)

  await sql.raw(`
    ALTER TABLE site_sliders
      ADD COLUMN IF NOT EXISTS is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER status
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS site_slider_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      slider_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(500) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_site_slider_activities_slider (slider_id, id)
    )
  `).execute(database)
}

export async function seedDefaultSiteSliders(database: Kysely<DynamicDatabase>, tenant: Tenant) {
  if (tenant.slug !== 'codexsun') {
    return
  }

  const slug = 'home-slider-1'
  const placement = 'home-slider'
  const existing = await database
    .selectFrom('site_sliders')
    .select('id')
    .where('tenant_id', '=', tenant.id)
    .where('slug', '=', slug)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  const row = {
    tenant_id: tenant.id,
    name: 'Home Slider 1',
    slug,
    placement,
    status: 'published',
    is_primary: 1,
    sort_order: 1,
    options_json: JSON.stringify({
      parallax: true,
      defaultDirection: 'fade',
      defaultBackgroundMode: 'cinematic',
      defaultIntensity: 'medium',
      defaultVariant: 'saas',
    }),
    slides_json: JSON.stringify(codexsunHomeSlides()),
    updated_by: 'system@codexsun.local',
    updated_at: new Date(),
  }

  if (existing?.id) {
    await database.updateTable('site_sliders').set(row).where('id', '=', existing.id).execute()
    await clearOtherHomePrimary(database, tenant.id, Number(existing.id), placement)
    return
  }

  const result = await database
    .insertInto('site_sliders')
    .values({
      uuid: dispatchPublicUuid(),
      created_by: 'system@codexsun.local',
      ...row,
    })
    .executeTakeFirst()

  await clearOtherHomePrimary(database, tenant.id, Number(result.insertId), placement)
}

async function clearOtherHomePrimary(database: Kysely<DynamicDatabase>, tenantId: number, sliderId: number, placement: string) {
  await database
    .updateTable('site_sliders')
    .set({ is_primary: 0, updated_at: new Date(), updated_by: 'system@codexsun.local' })
    .where('tenant_id', '=', tenantId)
    .where('placement', '=', placement)
    .where('id', '!=', sliderId)
    .where('deleted_at', 'is', null)
    .execute()
}

function codexsunHomeSlides() {
  return [
    {
      id: 1,
      title: 'Codexsun keeps business software simple',
      tagline: 'Run your website, billing, users, and daily work from one clean workspace that feels easy from the first click.',
      action: { text: 'Open dashboard', href: '/app' },
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80' },
      highlights: [{ text: 'Simple software', variant: 'glass' }, { text: 'One workspace', variant: 'primary' }],
      titleStyle: { color: '#ffffff', fontWeight: '800' },
      taglineStyle: { color: '#e5e7eb', fontWeight: '400' },
      badgeStyle: { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.24)', fontWeight: '700' },
      buttonStyle: { color: '#111827', backgroundColor: '#ffffff', borderColor: '#ffffff', borderRadius: '0.5rem', fontWeight: '800', iconSize: '1.25rem', size: 'md' },
      ctaColor: 'light',
      duration: 6500,
      direction: 'fade',
      backgroundMode: 'cinematic',
      intensity: 'medium',
      overlayColor: 'bg-gradient-to-r from-black/85 via-black/55 to-black/10',
    },
    {
      id: 2,
      title: 'Create a website that connects to real work',
      tagline: 'Show your brand clearly, manage public content, and guide visitors from the website into the right business action.',
      action: { text: 'Manage website', href: '/app' },
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1800&q=80' },
      highlights: [{ text: 'Website builder', variant: 'success' }, { text: 'Brand ready', variant: 'glass' }],
      titleStyle: { color: '#ffffff', fontWeight: '800' },
      taglineStyle: { color: '#dbeafe', fontWeight: '400' },
      badgeStyle: { color: '#ffffff', backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(110,231,183,0.35)', fontWeight: '700' },
      buttonStyle: { color: '#ffffff', backgroundColor: '#2563eb', borderColor: '#2563eb', borderRadius: '0.5rem', fontWeight: '800', iconSize: '1.25rem', size: 'md' },
      ctaColor: 'primary',
      duration: 6200,
      direction: 'left',
      backgroundMode: 'parallax',
      intensity: 'low',
      overlayColor: 'bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-transparent',
    },
    {
      id: 3,
      title: 'Billing work without the daily confusion',
      tagline: 'Prepare sales, receipts, payments, and reports in a focused flow, so office work stays clear and accountable.',
      action: { text: 'Start billing', href: '/app' },
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=80' },
      highlights: [{ text: 'Billing', variant: 'warning' }, { text: 'Reports', variant: 'glass' }],
      titleStyle: { color: '#ffffff', fontWeight: '800' },
      taglineStyle: { color: '#f8fafc', fontWeight: '400' },
      badgeStyle: { color: '#ffffff', backgroundColor: 'rgba(245,158,11,0.18)', borderColor: 'rgba(251,191,36,0.38)', fontWeight: '700' },
      buttonStyle: { color: '#111827', backgroundColor: '#fbbf24', borderColor: '#fbbf24', borderRadius: '0.5rem', fontWeight: '800', iconSize: '1.25rem', size: 'md' },
      ctaColor: 'warning',
      duration: 7000,
      direction: 'right',
      backgroundMode: 'cinematic',
      intensity: 'medium',
      overlayColor: 'bg-gradient-to-r from-black/80 via-black/50 to-black/5',
    },
    {
      id: 4,
      title: 'Give every team member a clearer place to work',
      tagline: 'Codexsun keeps access, settings, and everyday tools organized, so teams spend less time searching and more time finishing.',
      action: { text: 'Set up team', href: '/app' },
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80' },
      highlights: [{ text: 'Team access', variant: 'primary' }, { text: 'Organized', variant: 'glass' }],
      titleStyle: { color: '#ffffff', fontWeight: '800' },
      taglineStyle: { color: '#e0f2fe', fontWeight: '400' },
      badgeStyle: { color: '#ffffff', backgroundColor: 'rgba(37,99,235,0.18)', borderColor: 'rgba(147,197,253,0.38)', fontWeight: '700' },
      buttonStyle: { color: '#ffffff', backgroundColor: '#0ea5e9', borderColor: '#0ea5e9', borderRadius: '0.5rem', fontWeight: '800', iconSize: '1.25rem', size: 'md' },
      ctaColor: 'primary',
      duration: 6600,
      direction: 'left',
      backgroundMode: 'parallax',
      intensity: 'low',
      overlayColor: 'bg-gradient-to-r from-slate-950/85 via-slate-950/52 to-slate-950/5',
    },
    {
      id: 5,
      title: 'Start small, grow when your business is ready',
      tagline: 'Use the tools you need now, then add more workflows as your customers, accounts, website, and operations grow.',
      action: { text: 'Explore Codexsun', href: '/about' },
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1800&q=80' },
      highlights: [{ text: 'Flexible', variant: 'success' }, { text: 'Growth ready', variant: 'glass' }],
      titleStyle: { color: '#ffffff', fontWeight: '800' },
      taglineStyle: { color: '#ecfeff', fontWeight: '400' },
      badgeStyle: { color: '#ffffff', backgroundColor: 'rgba(20,184,166,0.18)', borderColor: 'rgba(94,234,212,0.38)', fontWeight: '700' },
      buttonStyle: { color: '#0f172a', backgroundColor: '#5eead4', borderColor: '#5eead4', borderRadius: '0.5rem', fontWeight: '800', iconSize: '1.25rem', size: 'md' },
      ctaColor: 'success',
      duration: 7200,
      direction: 'right',
      backgroundMode: 'cinematic',
      intensity: 'medium',
      overlayColor: 'bg-gradient-to-r from-black/82 via-black/48 to-black/5',
    },
  ]
}
