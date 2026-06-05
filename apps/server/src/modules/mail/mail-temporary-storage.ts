import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const storageRoot = path.resolve(
  process.cwd(),
  process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../../storage' : 'storage',
)

export interface TemporaryMailAttachment {
  fileName: string
  mimeType: string
  relativePath: string
  sizeBytes: number
}

export async function storeTemporaryMailAttachment(tenantSlug: string, input: {
  contents: Uint8Array
  fileName: string
  mimeType: string
}): Promise<TemporaryMailAttachment> {
  const fileName = sanitizeFileName(input.fileName)
  const extension = path.extname(fileName)
  const stem = path.basename(fileName, extension)
  const relativePath = path.posix.join('pdf', `${stem}-${randomUUID()}${extension}`)
  const diskPath = temporaryMailAttachmentPath(tenantSlug, relativePath)
  await mkdir(path.dirname(diskPath), { recursive: true })
  await writeFile(diskPath, input.contents)
  return { fileName, mimeType: input.mimeType, relativePath, sizeBytes: input.contents.byteLength }
}

export function temporaryMailAttachmentPath(tenantSlug: string, relativePath: string) {
  const tenantRoot = path.resolve(storageRoot, sanitizePathSegment(tenantSlug), 'public')
  const diskPath = path.resolve(tenantRoot, normalizeRelativePath(relativePath))
  if (diskPath !== tenantRoot && !diskPath.startsWith(`${tenantRoot}${path.sep}`)) {
    throw new Error('Temporary mail attachment path is outside tenant storage.')
  }
  return diskPath
}

export async function removeTemporaryMailAttachments(tenantSlug: string, attachments: TemporaryMailAttachment[]) {
  await Promise.all(attachments.map((attachment) => unlink(temporaryMailAttachmentPath(tenantSlug, attachment.relativePath)).catch(() => undefined)))
}

export function parseTemporaryMailAttachments(value: unknown): TemporaryMailAttachment[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const attachment = item as Record<string, unknown>
    const relativePath = normalizeRelativePath(String(attachment.relativePath ?? ''))
    if (!relativePath) return []
    return [{
      fileName: sanitizeFileName(String(attachment.fileName ?? path.basename(relativePath))),
      mimeType: String(attachment.mimeType ?? 'application/octet-stream').trim() || 'application/octet-stream',
      relativePath,
      sizeBytes: Math.max(0, Number(attachment.sizeBytes ?? 0) || 0),
    }]
  })
}

function normalizeRelativePath(value: string) {
  const normalized = value.trim().replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Temporary mail attachment path is invalid.')
  }
  return normalized
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ') || 'document.pdf'
}

function sanitizePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'tenant'
}
