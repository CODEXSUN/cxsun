import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException } from '../../../core/exceptions/http.exception.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { settings } from '../../../framework/config/index.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import type { ConnectorSubmissionInput } from '../domain/tirupur-connect.types.js'
import { numberValue, text, TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'

export interface SyncHeaders {
  'x-tc-signature'?: string | string[]
  'x-tc-timestamp'?: string | string[]
  'x-tc-idempotency-key'?: string | string[]
}

@Injectable()
export class TirupurConnectSyncService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async submit(headers: SyncHeaders, input: ConnectorSubmissionInput) {
    const secret = settings.tirupurConnect.syncSecret
    if (!secret) throw new ForbiddenException('Tirupur Connect sync is not configured.')
    const timestamp = first(headers['x-tc-timestamp'])
    const signature = first(headers['x-tc-signature'])
    const idempotencyKey = first(headers['x-tc-idempotency-key'])
    if (!timestamp || !signature || !idempotencyKey) throw new ForbiddenException('Signed sync headers are required.')
    const timestampSeconds = Number(timestamp)
    const tolerance = Math.max(30, settings.tirupurConnect.syncToleranceSeconds)
    if (!Number.isFinite(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > tolerance) {
      throw new ForbiddenException('Sync request timestamp is outside the allowed window.')
    }

    const sourceTenantId = Math.floor(numberValue(input.sourceTenantId))
    const sourceTenantSlug = text(input.sourceTenantSlug)
    const externalRecordUuid = text(input.externalRecordUuid)
    const entityType = text(input.entityType)
    const syncVersion = Math.floor(numberValue(input.syncVersion))
    if (!sourceTenantId || !sourceTenantSlug || !externalRecordUuid || !['company', 'product', 'capacity', 'certificate', 'offer'].includes(entityType) || syncVersion < 1 || !input.payload) {
      throw new BadRequestException('Complete connector source, entity, version, and payload fields are required.')
    }

    const canonicalPayload = stableStringify(input)
    const payloadHash = sha256(canonicalPayload)
    const expected = createHmac('sha256', secret).update(`${timestamp}.${idempotencyKey}.${payloadHash}`).digest('hex')
    if (!safeEqual(expected, signature)) throw new ForbiddenException('Invalid connector signature.')

    const database = this.repository.database()
    const priorRequest = await database.selectFrom('tc_sync_requests').selectAll().where('idempotency_key', '=', idempotencyKey).executeTakeFirst()
    if (priorRequest) {
      if (priorRequest.payload_hash !== payloadHash) throw new ForbiddenException('Idempotency key was already used for a different payload.')
      return priorRequest.response_payload ? JSON.parse(priorRequest.response_payload) as unknown : { ok: true, replay: true }
    }

    const existing = await database.selectFrom('tc_submissions').selectAll()
      .where('source_tenant_id', '=', sourceTenantId)
      .where('entity_type', '=', entityType)
      .where('external_record_uuid', '=', externalRecordUuid)
      .executeTakeFirst()
    if (existing && syncVersion <= existing.sync_version) {
      throw new BadRequestException('Sync version must be greater than the latest accepted version.')
    }

    const submissionUuid = existing?.uuid ?? generatePublicUuid()
    const submissionId = existing?.id ?? Number((await database.insertInto('tc_submissions').values({
      uuid: submissionUuid,
      source_tenant_id: sourceTenantId,
      source_tenant_slug: sourceTenantSlug,
      external_record_uuid: externalRecordUuid,
      entity_type: entityType,
      sync_version: syncVersion,
      status: 'submitted',
      submitted_at: nowIso(),
    }).executeTakeFirst()).insertId)
    const previousRevision = existing
      ? await database.selectFrom('tc_submission_revisions').select(({ fn }) => fn.max<number>('revision_number').as('revision')).where('submission_id', '=', submissionId).executeTakeFirst()
      : undefined
    const revisionNumber = Number(previousRevision?.revision ?? 0) + 1
    const revisionUuid = generatePublicUuid()
    const revisionId = Number((await database.insertInto('tc_submission_revisions').values({
      uuid: revisionUuid,
      submission_id: submissionId,
      revision_number: revisionNumber,
      sync_version: syncVersion,
      payload: JSON.stringify(input.payload),
      payload_hash: sha256(stableStringify(input.payload)),
      status: 'submitted',
    }).executeTakeFirst()).insertId)

    await database.updateTable('tc_submissions').set({
      source_tenant_slug: sourceTenantSlug,
      latest_revision_id: revisionId,
      sync_version: syncVersion,
      status: 'submitted',
      submitted_at: nowIso(),
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      updated_at: nowIso(),
    }).where('id', '=', submissionId).execute()

    const response = { ok: true, submissionUuid, revisionUuid, revisionNumber, status: 'submitted' }
    await database.insertInto('tc_sync_requests').values({
      uuid: generatePublicUuid(),
      idempotency_key: idempotencyKey,
      source_tenant_id: sourceTenantId,
      signature,
      payload_hash: payloadHash,
      status: 'accepted',
      response_payload: JSON.stringify(response),
    }).execute()
    await this.repository.audit({
      actorType: 'billing_connector',
      actorId: sourceTenantId,
      action: 'submission.revision_received',
      entityType: 'submission',
      entityId: submissionId,
      newValues: { revisionNumber, syncVersion, entityType, externalRecordUuid },
    })
    return response
  }
}

export function createConnectorSignature(secret: string, timestamp: string, idempotencyKey: string, input: ConnectorSubmissionInput) {
  const payloadHash = sha256(stableStringify(input))
  return createHmac('sha256', secret).update(`${timestamp}.${idempotencyKey}.${payloadHash}`).digest('hex')
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
