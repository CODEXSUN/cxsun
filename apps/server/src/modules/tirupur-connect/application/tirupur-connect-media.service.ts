import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sql } from 'kysely'
import { Injectable } from '../../../core/decorators/injectable.js'
import { Inject } from '../../../core/decorators/inject.js'
import { BadRequestException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import { TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'
import type { MarketplaceAdminIdentity } from './tirupur-connect-admin.service.js'

const BLOG_MEDIA_FOLDER = 'blog/featured-images'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const storageRoot = path.resolve(
  process.cwd(),
  process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../../storage' : 'storage',
  'tirupur-connect',
  'public',
)

type MediaUploadInput = {
  base64?: string
  fileName?: string
  mimeType?: string
  altText?: string
  caption?: string
}

type MediaUpdateInput = {
  altText?: string
  caption?: string
}

@Injectable()
export class TirupurConnectMediaService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async list(query: { search?: string }) {
    const search = String(query.search ?? '').trim()
    const result = await sql`
      SELECT uuid,folder,file_name,original_name,mime_type,extension,size_bytes,public_url,alt_text,caption,created_at,updated_at
      FROM tc_media_assets
      WHERE deleted_at IS NULL AND folder=${BLOG_MEDIA_FOLDER}
        AND (${search}='' OR original_name LIKE ${`%${search}%`} OR alt_text LIKE ${`%${search}%`} OR caption LIKE ${`%${search}%`})
      ORDER BY created_at DESC
      LIMIT 200
    `.execute(this.repository.database())
    return { records: result.rows, folder: BLOG_MEDIA_FOLDER }
  }

  async upload(admin: MarketplaceAdminIdentity, input: MediaUploadInput) {
    const encoded = String(input.base64 ?? '')
    const base64 = encoded.includes(',') ? encoded.split(',').at(-1) ?? '' : encoded
    if (!base64) throw new BadRequestException('Image content is required.')
    const buffer = Buffer.from(base64, 'base64')
    if (!buffer.length) throw new BadRequestException('Image content is empty.')
    if (buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Featured images must be 8 MB or smaller.')

    const mimeType = normalizeImageMime(input.mimeType, input.fileName)
    const extension = extensionFor(mimeType)
    const uuid = generatePublicUuid()
    const originalName = sanitizeFileName(input.fileName || `blog-image.${extension}`)
    const storageFileName = `${uuid}.${extension}`
    const relativePath = `${BLOG_MEDIA_FOLDER}/${storageFileName}`
    const diskPath = path.join(storageRoot, ...relativePath.split('/'))
    const publicUrl = `/api/v1/tirupur-connect/public/media/${uuid}`
    const createdBy = `${admin.type}:${admin.id}`

    await mkdir(path.dirname(diskPath), { recursive: true })
    await writeFile(diskPath, buffer)
    await sql`
      INSERT INTO tc_media_assets
        (uuid,folder,file_name,original_name,mime_type,extension,size_bytes,storage_path,public_url,alt_text,caption,tags,metadata,created_by)
      VALUES
        (${uuid},${BLOG_MEDIA_FOLDER},${storageFileName},${originalName},${mimeType},${extension},${buffer.length},${relativePath},${publicUrl},
         ${nullable(input.altText)},${nullable(input.caption)},${JSON.stringify(['blog', 'featured-image'])},
         ${JSON.stringify({ checksum: createHash('sha256').update(buffer).digest('hex') })},${createdBy})
    `.execute(this.repository.database())
    return this.find(uuid)
  }

  async content(uuid: string) {
    const asset = await this.find(uuid)
    const diskPath = path.join(storageRoot, ...String(asset.storage_path).split('/'))
    const file = await readFile(diskPath).catch(() => {
      throw new NotFoundException('Media image was not found.')
    })
    return { asset, file }
  }

  async update(admin: MarketplaceAdminIdentity, uuid: string, input: MediaUpdateInput) {
    await this.find(uuid)
    await sql`
      UPDATE tc_media_assets
      SET alt_text=${nullable(input.altText)}, caption=${nullable(input.caption)}, updated_at=NOW()
      WHERE uuid=${uuid} AND deleted_at IS NULL
    `.execute(this.repository.database())
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'blog.media.updated',
      entityType: 'media_asset',
      newValues: { uuid, altText: input.altText, caption: input.caption },
    })
    return this.find(uuid)
  }

  private async find(uuid: string) {
    const result = await sql`
      SELECT uuid,folder,file_name,original_name,mime_type,extension,size_bytes,storage_path,public_url,alt_text,caption,created_at,updated_at
      FROM tc_media_assets WHERE uuid=${uuid} AND deleted_at IS NULL LIMIT 1
    `.execute(this.repository.database())
    const asset = result.rows[0] as Record<string, unknown> | undefined
    if (!asset) throw new NotFoundException('Media image was not found.')
    return asset
  }
}

function normalizeImageMime(value?: string, fileName?: string) {
  const mime = String(value ?? '').toLowerCase()
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mime)) return mime
  const extension = path.extname(String(fileName ?? '')).toLowerCase()
  const inferred = new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
    ['.gif', 'image/gif'],
    ['.svg', 'image/svg+xml'],
  ]).get(extension)
  if (inferred) return inferred
  throw new BadRequestException('Featured image must be JPG, PNG, WebP, GIF, or SVG.')
}

function extensionFor(mimeType: string) {
  return mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/svg+xml' ? 'svg' : mimeType.replace('image/', '')
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ') || 'blog-image'
}

function nullable(value?: string) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}
