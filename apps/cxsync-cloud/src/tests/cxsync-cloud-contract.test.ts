import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BadRequestException } from '../../../server/src/core/exceptions/http.exception.js'
import { normalizeSyncReportInput } from '../reporters/sync.reporter.js'
import { candidateDatabaseName, normalizePrepareInput } from '../fleet/fleet-upgrade.service.js'

const jobId = '2cb893c8-98ff-4d42-a9c4-d807eea52b28'
const normalized = normalizeSyncReportInput({
  jobId,
  phases: [{ id: 'upload-report', status: 'completed' }],
  summary: { diffTotal: 0 },
  tenant: {
    corporateId: 'CXSUN-DEMO',
    tenantCode: '101',
    tenantName: 'CXSun Demo',
  },
})

assert.equal(normalized.jobId, jobId)
assert.equal(normalized.tenantCode, '101')
assert.equal(normalized.phases.length, 1)
assert.throws(
  () => normalizeSyncReportInput({ jobId, phases: [], tenant: { corporateId: '', tenantCode: '101', tenantName: 'Demo' } }),
  (error: unknown) => error instanceof BadRequestException && error.statusCode === 400,
)

const fleetInput = normalizePrepareInput({
  canaryTenantId: 101,
  idempotencyKey: 'release-1.0.127-production-rehearsal',
  releaseVersion: '1.0.127',
  tenantIds: [101, 102, 102],
})
assert.deepEqual(fleetInput.tenantIds, [101, 102])
assert.equal(fleetInput.canaryTenantId, 101)
assert.throws(() => normalizePrepareInput({ idempotencyKey: 'x', releaseVersion: 'daily', tenantIds: [] }), /semantic version/)
const candidateName = candidateDatabaseName('2cb893c8-98ff-4d42-a9c4-d807eea52b28', 'a-very-long-tenant-database-name'.repeat(4), 101)
assert.match(candidateName, /^cxu_[a-f0-9]{8}_/)
assert.ok(candidateName.length <= 64)
assert.throws(
  () => normalizeSyncReportInput({ jobId: 'not-a-uuid', phases: [], tenant: { corporateId: 'DEMO', tenantCode: '101', tenantName: 'Demo' } }),
  /jobId must be a UUID/,
)

const cloudModule = await readFile(resolve(process.cwd(), 'src/cxsync-cloud.module.ts'), 'utf8')
const desktopSyncEngine = await readFile(resolve(process.cwd(), '../cxsync/electron/main/tenant-sync-engine.ts'), 'utf8')
const tenantController = await readFile(resolve(process.cwd(), '../server/src/modules/cxsync/cxsync.controller.ts'), 'utf8')
const fleetExecutor = await readFile(resolve(process.cwd(), 'src/fleet/fleet-clone.executor.ts'), 'utf8')
const fleetService = await readFile(resolve(process.cwd(), 'src/fleet/fleet-upgrade.service.ts'), 'utf8')
const cloudMain = await readFile(resolve(process.cwd(), 'src/main.ts'), 'utf8')
const containerEntrypoint = await readFile(resolve(process.cwd(), '../../.container/entrypoint.sh'), 'utf8')
const containerCompose = await readFile(resolve(process.cwd(), '../../.container/docker-compose.yml'), 'utf8')
const sqlDumpService = await readFile(resolve(process.cwd(), 'src/backups/sql-dump.service.ts'), 'utf8')
const sqlDumpPage = await readFile(resolve(process.cwd(), '../cxsync/src/features/backup/sql-dump-page.tsx'), 'utf8')
const preloadGenerator = await readFile(resolve(process.cwd(), '../cxsync/scripts/write-preload-cjs.mjs'), 'utf8')
const diagnosticsService = await readFile(resolve(process.cwd(), 'src/diagnostics/cloud-diagnostics.service.ts'), 'utf8')

assert.doesNotMatch(cloudModule, /AuthModule|CxSyncModule/, 'CXSync Cloud must not mount tenant-backend auth or snapshot modules.')
assert.match(desktopSyncEngine, /api\/v1\/cxsync-cloud\/reports/, 'Desktop reports must target CXSync Cloud.')
assert.doesNotMatch(desktopSyncEngine, /api\/v1\/cxsync\/reports/, 'Desktop must not upload audit reports to a tenant backend.')
assert.doesNotMatch(tenantController, /Post\('reports'\)/, 'The tenant backend must remain snapshot-only for CXSync.')
assert.match(fleetExecutor, /CXSYNC_FLEET_CLONE_ENABLED/, 'Fleet clone execution must be protected by an explicit server-side gate.')
assert.match(fleetExecutor, /CXSYNC_FLEET_SOURCE_QUIESCED/, 'Fleet clone execution must require an approved source-write maintenance window.')
assert.doesNotMatch(`${fleetExecutor}\n${fleetService}`, /UPDATE\s+tenants\s+SET\s+db_name/i, 'Fleet preparation must never cut over a production tenant database.')
assert.match(fleetService, /max_parallel, canary_tenant_id/, 'Fleet batches must persist serial canary-first safety controls.')
assert.match(fleetService, /void this\.executeClone/, 'Large fleet clones must run outside the browser request lifetime.')
assert.match(fleetService, /restarted while this clone was running/, 'Interrupted clone work must fail closed with retained evidence guidance.')
assert.match(cloudMain, /CXSYNC_CLOUD_SKIP_PLATFORM_MIGRATIONS/, 'Isolated Cloud startup must support skipping shared platform migrations and seeds.')
assert.match(containerCompose, /CXSYNC_CLOUD_SKIP_PLATFORM_MIGRATIONS: "true"/, 'The isolated maintenance service must always skip shared platform migrations and seeds.')
assert.match(containerCompose, /cxsync-maintenance-workspace:\/workspace/, 'CXSync maintenance must own a separate workspace volume.')
assert.match(containerCompose, /cxsync-maintenance-storage:\/workspace\/cxsun\/storage/, 'CXSync maintenance evidence must not use live application media storage.')
assert.ok(
  containerEntrypoint.indexOf('if [ "$CXSUN_RUNTIME_MODE" = "cxsync-maintenance" ]') < containerEntrypoint.indexOf('run_step "Running database setup"'),
  'The isolated maintenance branch must exit before normal application database setup.',
)
assert.match(sqlDumpService, /storage', 'cxsync', 'sql-dumps'/, 'Cloud SQL dumps must stay inside CXSync storage.')
assert.match(sqlDumpService, /'--databases'/, 'Every SQL backup must use a complete database dump.')
assert.match(sqlDumpService, /`\$\{path\}\.partial`/, 'Cloud dumps must remain partial until completion.')
assert.match(sqlDumpService, /await rename\(partialPath, path\)/, 'Cloud dumps must be atomically published after success.')
for (const method of ['chooseSqlDumpDirectory', 'listSqlDumpDatabases', 'inspectSqlDumpTables', 'startSqlDump', 'getSqlDumpJob', 'startSqlDumpQueue', 'getSqlDumpQueue', 'runCloudDiagnostics', 'startMirrorFullSync', 'getMirrorFullSyncJob', 'listMirrorFullSyncJobs', 'listMirrorIncrementalSyncJobs', 'startMirrorFullSyncQueue', 'getMirrorFullSyncQueue', 'getMirrorSchedule', 'saveMirrorSchedule', 'startMirrorIncrementalSync', 'getMirrorIncrementalSyncJob', 'startMirrorIncrementalSyncQueue', 'getMirrorIncrementalSyncQueue', 'pauseMirrorIncrementalSyncQueue', 'resumeMirrorIncrementalSyncQueue', 'stopMirrorIncrementalSyncQueue']) {
  assert.match(preloadGenerator, new RegExp(`${method}:`), `The packaged Electron preload must expose ${method}.`)
}
assert.match(sqlDumpService, /NOT IN \('information_schema', 'mysql', 'performance_schema', 'sys'\)/, 'SQL dump inventory must exclude MariaDB system databases.')
assert.match(sqlDumpService, /for \(const item of prepared\)/, 'Bulk SQL dumps must execute through a serial queue.')
assert.match(sqlDumpService, /toISOString\(\)\.slice\(0, 13\)/, 'SQL dump filenames must use database plus UTC date and hour only.')
assert.match(sqlDumpPage, /Bulk dump in queue/, 'The SQL dump list must expose the bulk queue action.')
assert.match(sqlDumpPage, /Back to databases/, 'The SQL dump detail surface must return to the database list.')
assert.match(diagnosticsService, /SELECT VERSION\(\) AS version/, 'Cloud diagnostics must verify MariaDB with a read-only query.')
assert.match(diagnosticsService, /information_schema\.SCHEMATA/, 'Cloud diagnostics must verify active tenant database visibility.')
assert.doesNotMatch(diagnosticsService, /process\.env\.DB_PASSWORD|dbConfig\.master\.password/, 'Cloud diagnostics must not return or directly expose database passwords.')
assert.match(await readFile(resolve(process.cwd(), 'src/mirror/mirror.service.ts'), 'utf8'), /storage', 'cxsync', 'mirror', 'full'/, 'Mirror full dumps must stay inside CXSync mirror storage.')

console.log('CXSync Cloud contract tests passed.')
