import { sql, type Kysely } from 'kysely'

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
