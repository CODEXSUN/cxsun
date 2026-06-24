import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const preloadPath = resolve(appRoot, "dist/electron/preload/index.cjs")

await mkdir(dirname(preloadPath), { recursive: true })
await writeFile(preloadPath, `'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cxsyncDesktop', {
  isDesktop: true,
  authenticateLocalAdmin: (email, password) => ipcRenderer.invoke('cxsync:auth:login', email, password),
  captureCodebaseSchemaBaseline: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline:capture-codebase', id),
  captureTenantSchemaBaseline: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline:capture', id),
  compareTenantSchema: (id) => ipcRenderer.invoke('cxsync:tenants:schema-diff', id),
  deleteTenantConnection: (id) => ipcRenderer.invoke('cxsync:tenants:delete', id),
  getLocalEnvironmentStatus: () => ipcRenderer.invoke('cxsync:environment:status'),
  getServiceKeyStatus: () => ipcRenderer.invoke('cxsync:service-key:status'),
  generateServiceKey: () => ipcRenderer.invoke('cxsync:service-key:generate'),
  saveServiceKey: (key) => ipcRenderer.invoke('cxsync:service-key:save', key),
  saveCloudServiceUrl: (url) => ipcRenderer.invoke('cxsync:cloud-service:url:save', url),
  getCloudServiceHandshake: () => ipcRenderer.invoke('cxsync:cloud-service:handshake'),
  verifyCloudServiceHandshake: () => ipcRenderer.invoke('cxsync:cloud-service:handshake:verify'),
  runCloudDiagnostics: () => ipcRenderer.invoke('cxsync:cloud-service:diagnostics'),
  startMirrorFullSync: (id, targetDatabase) => ipcRenderer.invoke('cxsync:mirror:full-sync:start', id, targetDatabase),
  getMirrorFullSyncJob: (id) => ipcRenderer.invoke('cxsync:mirror:full-sync:job', id),
  listMirrorFullSyncJobs: () => ipcRenderer.invoke('cxsync:mirror:full-sync:list'),
  listMirrorIncrementalSyncJobs: () => ipcRenderer.invoke('cxsync:mirror:incremental:list'),
  exportMirrorAudit: (id) => ipcRenderer.invoke('cxsync:mirror:audit:export', id),
  startMirrorFullSyncQueue: (ids) => ipcRenderer.invoke('cxsync:mirror:full-sync:queue:start', ids),
  getMirrorFullSyncQueue: (id) => ipcRenderer.invoke('cxsync:mirror:full-sync:queue', id),
  getMirrorSchedule: () => ipcRenderer.invoke('cxsync:mirror:schedule'),
  saveMirrorSchedule: (schedule) => ipcRenderer.invoke('cxsync:mirror:schedule:save', schedule),
  startMirrorIncrementalSync: (id, targetDatabase) => ipcRenderer.invoke('cxsync:mirror:incremental:start', id, targetDatabase),
  getMirrorIncrementalSyncJob: (id) => ipcRenderer.invoke('cxsync:mirror:incremental:job', id),
  startMirrorIncrementalSyncQueue: (ids) => ipcRenderer.invoke('cxsync:mirror:incremental:queue:start', ids),
  getMirrorIncrementalSyncQueue: (id) => ipcRenderer.invoke('cxsync:mirror:incremental:queue', id),
  pauseMirrorIncrementalSyncQueue: (id) => ipcRenderer.invoke('cxsync:mirror:incremental:queue:pause', id),
  resumeMirrorIncrementalSyncQueue: (id) => ipcRenderer.invoke('cxsync:mirror:incremental:queue:resume', id),
  stopMirrorIncrementalSyncQueue: (id) => ipcRenderer.invoke('cxsync:mirror:incremental:queue:stop', id),
  getTenantConnection: (id) => ipcRenderer.invoke('cxsync:tenants:get', id),
  getTenantCloudSnapshot: (id) => ipcRenderer.invoke('cxsync:tenants:cloud-snapshot', id),
  captureTenantCloudSnapshot: (id) => ipcRenderer.invoke('cxsync:tenants:cloud-snapshot:capture', id),
  getTenantUpgradePlan: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-plan', id),
  generateTenantUpgradePlan: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-plan:generate', id),
  getTenantUpgradePreflight: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-preflight', id),
  runTenantUpgradePreflight: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-preflight:run', id),
  getTenantUpgradeExecution: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-execution', id),
  executeTenantUpgrade: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-execution:run', id),
  createTenantBackup: (id) => ipcRenderer.invoke('cxsync:tenants:backup:create', id),
  getTenantBackup: (id) => ipcRenderer.invoke('cxsync:tenants:backup', id),
  getTenantSyncJob: (id) => ipcRenderer.invoke('cxsync:tenants:sync-job', id),
  listTenantSyncJobs: (id) => ipcRenderer.invoke('cxsync:tenants:sync-jobs', id),
  checkTenantSyncService: (id) => ipcRenderer.invoke('cxsync:tenants:sync-service:check', id),
  exportTenantSyncReport: (id) => ipcRenderer.invoke('cxsync:tenants:sync-report:export', id),
  runTenantSyncJob: (id) => ipcRenderer.invoke('cxsync:tenants:sync-job:run', id),
  continueTenantSyncJob: (id) => ipcRenderer.invoke('cxsync:tenants:sync-job:continue', id),
  retryTenantSyncJob: (id) => ipcRenderer.invoke('cxsync:tenants:sync-job:retry', id),
  getTenantSchemaBaseline: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline', id),
  getCodebaseSchemaBuildStatus: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline:build-status', id),
  inspectTenantDatabase: (id) => ipcRenderer.invoke('cxsync:tenants:inspect', id),
  listTenantHandshakeHistory: (id) => ipcRenderer.invoke('cxsync:tenants:history', id),
  listTenantConnections: () => ipcRenderer.invoke('cxsync:tenants:list'),
  saveTenantConnection: (input, id) => ipcRenderer.invoke('cxsync:tenants:save', input, id),
  verifyTenantConnection: (id) => ipcRenderer.invoke('cxsync:tenants:verify', id),
  chooseSqlDumpDirectory: () => ipcRenderer.invoke('cxsync:sql-dump:directory:choose'),
  listSqlDumpDatabases: (credentials) => ipcRenderer.invoke('cxsync:sql-dump:databases', credentials),
  inspectSqlDumpTables: (credentials) => ipcRenderer.invoke('cxsync:sql-dump:tables', credentials),
  startSqlDump: (credentials, destination) => ipcRenderer.invoke('cxsync:sql-dump:start', credentials, destination),
  getSqlDumpJob: (id) => ipcRenderer.invoke('cxsync:sql-dump:job', id),
  startSqlDumpQueue: (credentials, databases, destination) => ipcRenderer.invoke('cxsync:sql-dump:queue:start', credentials, databases, destination),
  getSqlDumpQueue: (id) => ipcRenderer.invoke('cxsync:sql-dump:queue', id),
})
`)
