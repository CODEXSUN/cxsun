import assert from 'node:assert/strict'
import { normalizeMarketplaceRole } from '../domain/tirupur-connect.policy.js'
import { createConnectorSignature } from '../application/tirupur-connect-sync.service.js'
import { stableJson } from '../application/tirupur-connect-frontend-content.service.js'

const secret = 'test-sync-secret'
const timestamp = '1781750400'
const idempotencyKey = 'tenant-103-company-ABC123-v2'

const firstPayload = {
  sourceTenantId: 103,
  sourceTenantSlug: 'cotton-knits',
  externalRecordUuid: 'ABC123XY',
  entityType: 'company' as const,
  syncVersion: 2,
  payload: {
    name: 'Cotton Knits Fashion',
    city: 'Tirupur',
    certifications: ['GOTS', 'OEKO-TEX'],
  },
}

const reorderedPayload = {
  payload: {
    certifications: ['GOTS', 'OEKO-TEX'],
    city: 'Tirupur',
    name: 'Cotton Knits Fashion',
  },
  syncVersion: 2,
  entityType: 'company' as const,
  externalRecordUuid: 'ABC123XY',
  sourceTenantSlug: 'cotton-knits',
  sourceTenantId: 103,
}

const firstSignature = createConnectorSignature(secret, timestamp, idempotencyKey, firstPayload)
const reorderedSignature = createConnectorSignature(secret, timestamp, idempotencyKey, reorderedPayload)

assert.equal(firstSignature, reorderedSignature, 'Connector signatures must be stable across object key ordering.')
assert.equal(firstSignature.length, 64, 'Connector signature must be a SHA-256 HMAC hex digest.')
assert.notEqual(
  firstSignature,
  createConnectorSignature(secret, timestamp, idempotencyKey, { ...firstPayload, syncVersion: 3 }),
  'Changing a sync version must change the connector signature.',
)
assert.equal(normalizeMarketplaceRole('supplier'), 'supplier')
assert.throws(() => normalizeMarketplaceRole('marketplace-admin'), /only be assigned by an administrator/)
assert.equal(
  stableJson({ sections: { hero: { title: 'Tirupur Connect', enabled: true } }, schemaVersion: 1 }),
  stableJson({ schemaVersion: 1, sections: { hero: { enabled: true, title: 'Tirupur Connect' } } }),
  'Frontend release serialization must be stable across object key ordering.',
)

console.log('Tirupur Connect contract tests passed.')
