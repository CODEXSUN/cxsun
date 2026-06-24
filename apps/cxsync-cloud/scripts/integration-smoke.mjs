import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const baseUrl = (process.env.CXSYNC_CLOUD_TEST_URL || 'http://127.0.0.1:6077').replace(/\/+$/, '')
const serviceKey = required('CXSYNC_SERVICE_KEY')
const corporateId = required('CXSYNC_TEST_CORPORATE_ID')
const tenantCode = required('CXSYNC_TEST_TENANT_CODE')
const tenantName = process.env.CXSYNC_TEST_TENANT_NAME || 'CXSync integration tenant'
const headers = { 'Content-Type': 'application/json', 'x-cxsync-service-key': serviceKey }
const releaseVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version

const unauthorized = await fetch(`${baseUrl}/api/v1/cxsync-cloud/status`)
assert.equal(unauthorized.status, 401, 'CXSync Cloud status must reject requests without a service key or admin session.')

const status = await request('/api/v1/cxsync-cloud/status')
assert.equal(status.ok, true)

const handshake = await request('/api/v1/cxsync-cloud/handshake', {
  body: JSON.stringify({
    apiUrl: baseUrl,
    checkedAt: new Date().toISOString(),
    desktopId: `integration-${randomUUID()}`,
    latencyMs: 0,
    message: 'CXSync integration smoke handshake.',
    ok: true,
    service: 'cxsync-cloud',
    status: 'accepted',
  }),
  method: 'POST',
})
assert.equal(handshake.ok, true)

const jobId = randomUUID()
const payload = {
  jobId,
  phases: [{ id: 'upload-report', status: 'completed' }],
  summary: { cloudTables: 1, diffTotal: 0, localTables: 1 },
  tenant: { corporateId, tenantCode, tenantName },
}
const first = await request('/api/v1/cxsync-cloud/reports', { body: JSON.stringify(payload), method: 'POST' })
const duplicate = await request('/api/v1/cxsync-cloud/reports', { body: JSON.stringify(payload), method: 'POST' })

assert.equal(first.ok, true)
assert.equal(first.report.duplicate, false)
assert.equal(duplicate.report.duplicate, true)
assert.equal(duplicate.report.reportId, first.report.reportId)

const reports = await request('/api/v1/cxsync-cloud/reports')
assert.equal(reports.ok, true)
assert.ok(reports.reports.some((report) => report.jobId === jobId && report.reportId === first.report.reportId))

const fleet = await request('/api/v1/cxsync-cloud/fleet/tenants')
const fleetTenant = fleet.tenants.find((tenant) => String(tenant.tenantCode) === tenantCode && tenant.corporateId === corporateId)
assert.ok(fleetTenant, 'The integration tenant must appear in the active MariaDB fleet inventory.')
const prepared = await request('/api/v1/cxsync-cloud/fleet/batches', {
  body: JSON.stringify({
    canaryTenantId: fleetTenant.id,
    idempotencyKey: `integration-${jobId}`,
    releaseVersion,
    tenantIds: [fleetTenant.id],
  }),
  method: 'POST',
})
assert.equal(prepared.batch.status, 'prepared')
assert.equal(prepared.batch.maxParallel, 1)
assert.equal(prepared.batch.stopOnFailure, true)
assert.equal(prepared.batch.items[0].isCanary, true)
assert.notEqual(prepared.batch.items[0].candidateDatabase, prepared.batch.items[0].sourceDatabase)

console.log(`CXSync Cloud integration smoke passed for job ${jobId} and fleet batch ${prepared.batch.id}.`)

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  const body = await response.json().catch(() => ({}))
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`)
  return body
}

function required(key) {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} is required for the CXSync Cloud integration smoke test.`)
  return value
}
