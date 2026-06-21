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
  getTenantConnection: (id) => ipcRenderer.invoke('cxsync:tenants:get', id),
  getTenantUpgradePlan: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-plan', id),
  generateTenantUpgradePlan: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-plan:generate', id),
  getTenantUpgradePreflight: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-preflight', id),
  runTenantUpgradePreflight: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-preflight:run', id),
  getTenantUpgradeExecution: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-execution', id),
  executeTenantUpgrade: (id) => ipcRenderer.invoke('cxsync:tenants:upgrade-execution:run', id),
  createTenantBackup: (id) => ipcRenderer.invoke('cxsync:tenants:backup:create', id),
  getTenantBackup: (id) => ipcRenderer.invoke('cxsync:tenants:backup', id),
  getTenantSchemaBaseline: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline', id),
  getCodebaseSchemaBuildStatus: (id) => ipcRenderer.invoke('cxsync:tenants:schema-baseline:build-status', id),
  inspectTenantDatabase: (id) => ipcRenderer.invoke('cxsync:tenants:inspect', id),
  listTenantHandshakeHistory: (id) => ipcRenderer.invoke('cxsync:tenants:history', id),
  listTenantConnections: () => ipcRenderer.invoke('cxsync:tenants:list'),
  saveTenantConnection: (input, id) => ipcRenderer.invoke('cxsync:tenants:save', input, id),
  verifyTenantConnection: (id) => ipcRenderer.invoke('cxsync:tenants:verify', id),
})
`)
