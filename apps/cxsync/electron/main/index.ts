import { createServer, type Server } from "node:http"
import { existsSync } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { dirname, extname, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { app, BrowserWindow, ipcMain, shell } from "electron"
import { authenticateLocalAdmin, getLocalEnvironmentStatus } from "./local-admin.js"
import { captureCodebaseSchemaBaseline, captureTenantSchemaBaseline, compareTenantSchema, getCodebaseSchemaBuildStatus, getTenantSchemaBaseline, inspectTenantDatabase } from "./tenant-database-inspector.js"
import { deleteTenantConnection, getTenantConnection, listTenantConnections, listTenantHandshakeHistory, saveTenantConnection } from "./tenant-connection-store.js"
import { verifyTenantConnection } from "./tenant-connection-verifier.js"
import { generateTenantUpgradePlan, getTenantUpgradePlan } from "./tenant-upgrade-planner.js"
import { getTenantUpgradePreflight, runTenantUpgradePreflight } from "./tenant-upgrade-preflight.js"
import { createTenantBackup, getTenantBackup } from "./tenant-backup-manager.js"
import { captureTenantCloudSnapshot, getTenantCloudSnapshot } from "./tenant-cloud-snapshot.js"
import { executeTenantUpgrade, getTenantUpgradeExecution } from "./tenant-upgrade-executor.js"
import type { TenantConnectionInput } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"

const compiledRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageRoot = resolve(compiledRoot, "../../..")
const developmentUrl = process.env.CXSYNC_DEV_SERVER_URL?.trim()
const loopbackHost = "127.0.0.1"
let frontendServer: Server | undefined
let mainWindow: BrowserWindow | undefined

app.disableHardwareAcceleration()
registerIpc()

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.whenReady().then(async () => {
    await getCxSyncDatabase()
    await createWindow()
  }).catch((error: unknown) => {
    console.error("CXSync failed to start.", error)
    app.quit()
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow()
})

app.on("before-quit", () => frontendServer?.close())

async function createWindow() {
  const window = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: "#f5f7fb",
    height: 900,
    minHeight: 700,
    minWidth: 1040,
    show: false,
    title: "CXSync",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: resolve(compiledRoot, "../preload/index.cjs"),
      sandbox: true,
      spellcheck: false,
    },
    width: 1440,
  })

  mainWindow = window
  window.once("ready-to-show", () => window.show())
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = undefined
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) void shell.openExternal(url)
    return { action: "deny" }
  })
  await window.loadURL(await applicationUrl())
}

function registerIpc() {
  ipcMain.handle("cxsync:auth:login", (_event, email: string, password: string) => authenticateLocalAdmin(email, password))
  ipcMain.handle("cxsync:environment:status", () => getLocalEnvironmentStatus())
  ipcMain.handle("cxsync:tenants:list", () => listTenantConnections())
  ipcMain.handle("cxsync:tenants:get", (_event, id: string) => getTenantConnection(id))
  ipcMain.handle("cxsync:tenants:cloud-snapshot", (_event, id: string) => getTenantCloudSnapshot(id))
  ipcMain.handle("cxsync:tenants:cloud-snapshot:capture", (_event, id: string) => captureTenantCloudSnapshot(id))
  ipcMain.handle("cxsync:tenants:history", (_event, id: string) => listTenantHandshakeHistory(id))
  ipcMain.handle("cxsync:tenants:inspect", (_event, id: string) => inspectTenantDatabase(id))
  ipcMain.handle("cxsync:tenants:schema-baseline", (_event, id: string) => getTenantSchemaBaseline(id))
  ipcMain.handle("cxsync:tenants:schema-baseline:build-status", (_event, id: string) => getCodebaseSchemaBuildStatus(id))
  ipcMain.handle("cxsync:tenants:schema-baseline:capture-codebase", (_event, id: string) => captureCodebaseSchemaBaseline(id))
  ipcMain.handle("cxsync:tenants:schema-baseline:capture", (_event, id: string) => captureTenantSchemaBaseline(id))
  ipcMain.handle("cxsync:tenants:schema-diff", (_event, id: string) => compareTenantSchema(id))
  ipcMain.handle("cxsync:tenants:upgrade-plan", (_event, id: string) => getTenantUpgradePlan(id))
  ipcMain.handle("cxsync:tenants:upgrade-plan:generate", (_event, id: string) => generateTenantUpgradePlan(id))
  ipcMain.handle("cxsync:tenants:upgrade-preflight", (_event, id: string) => getTenantUpgradePreflight(id))
  ipcMain.handle("cxsync:tenants:upgrade-preflight:run", (_event, id: string) => runTenantUpgradePreflight(id))
  ipcMain.handle("cxsync:tenants:upgrade-execution", (_event, id: string) => getTenantUpgradeExecution(id))
  ipcMain.handle("cxsync:tenants:upgrade-execution:run", (_event, id: string) => executeTenantUpgrade(id))
  ipcMain.handle("cxsync:tenants:backup", (_event, id: string) => getTenantBackup(id))
  ipcMain.handle("cxsync:tenants:backup:create", (_event, id: string) => createTenantBackup(id))
  ipcMain.handle("cxsync:tenants:save", (_event, input: TenantConnectionInput, id?: string) => saveTenantConnection(input, id))
  ipcMain.handle("cxsync:tenants:delete", (_event, id: string) => deleteTenantConnection(id))
  ipcMain.handle("cxsync:tenants:verify", (_event, id: string) => verifyTenantConnection(id))
}

async function applicationUrl() {
  if (developmentUrl) return developmentUrl

  const frontendRoot = app.isPackaged
    ? resolve(process.resourcesPath, "frontend")
    : resolve(packageRoot, "../../build/apps/cxsync")
  if (!existsSync(resolve(frontendRoot, "index.html"))) {
    throw new Error(`CXSync frontend was not found at ${frontendRoot}. Run the CXSync build first.`)
  }

  frontendServer = createServer((request, response) => {
    void serveFrontend(frontendRoot, request.url ?? "/", response)
  })
  await new Promise<void>((resolveReady, reject) => {
    frontendServer?.once("error", reject)
    frontendServer?.listen(0, loopbackHost, resolveReady)
  })
  const address = frontendServer.address()
  if (!address || typeof address === "string") throw new Error("CXSync local frontend server did not expose a port.")
  return `http://${loopbackHost}:${address.port}`
}

async function serveFrontend(frontendRoot: string, rawUrl: string, response: import("node:http").ServerResponse) {
  try {
    const pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1").pathname)
    const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "")
    const candidate = resolve(frontendRoot, requestedPath)
    const safeCandidate = candidate === frontendRoot || candidate.startsWith(`${frontendRoot}${sep}`)
      ? candidate
      : resolve(frontendRoot, "index.html")
    const filePath = await existingFile(safeCandidate) ?? resolve(frontendRoot, "index.html")
    const body = await readFile(filePath)
    response.writeHead(200, {
      "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Length": body.byteLength,
      "Content-Type": contentType(filePath),
    })
    response.end(body)
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("CXSync could not load its local interface.")
  }
}

async function existingFile(path: string) {
  try {
    return (await stat(path)).isFile() ? path : undefined
  } catch {
    return undefined
  }
}

function contentType(path: string) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  } as Record<string, string>)[extname(path).toLowerCase()] ?? "application/octet-stream"
}
