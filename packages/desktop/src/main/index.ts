import { createServer, type Server } from 'node:http'
import { lookup } from 'node:dns/promises'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, shell } from 'electron'

const compiledRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = resolve(compiledRoot, '..')
const desktopHost = process.env.ELECTRON_APP_HOST?.trim() || 'codexsun.local'
const developmentUrl = process.env.ELECTRON_DEV_SERVER_URL?.trim()
const windowIconPath = resolve(compiledRoot, 'assets/icon.ico')
const loopbackHost = '127.0.0.1'
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:'])
const e2eSmokeMode = process.env.ELECTRON_E2E_SMOKE === '1'

let frontendServer: Server | undefined
let mainWindow: BrowserWindow | undefined

if (e2eSmokeMode) {
  app.setPath('userData', resolve(tmpdir(), 'cxsun-electron-e2e'))
}

const acquiredSingleInstanceLock = app.requestSingleInstanceLock()

if (!acquiredSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(createApplicationWindow).catch((error: unknown) => {
    console.error('CXSun desktop failed to start.', error)
    app.quit()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createApplicationWindow()
  }
})

app.on('before-quit', () => {
  frontendServer?.close()
})

async function createApplicationWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#09090b',
    title: 'CXSun',
    autoHideMenuBar: true,
    icon: windowIconPath,
    webPreferences: {
      preload: resolve(compiledRoot, 'preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow = window
  configureApplicationWindow(window, { runSmoke: true })
  await window.loadURL(await applicationUrl())
}

async function createChildApplicationWindow(url: string) {
  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    show: false,
    backgroundColor: '#09090b',
    title: 'CXSun',
    autoHideMenuBar: true,
    icon: windowIconPath,
    webPreferences: {
      preload: resolve(compiledRoot, 'preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  configureApplicationWindow(window)
  await window.loadURL(url)
}

function configureApplicationWindow(window: BrowserWindow, options: { runSmoke?: boolean } = {}) {
  window.once('ready-to-show', () => window.show())
  window.webContents.once('did-finish-load', () => {
    if (e2eSmokeMode && options.runSmoke) void runE2eSmoke(window)
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isApplicationUrl(url, window.webContents.getURL())) {
      void createChildApplicationWindow(url)
      return { action: 'deny' }
    }

    void openExternalUrl(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isApplicationUrl(url, window.webContents.getURL())) return
    event.preventDefault()
    void openExternalUrl(url)
  })
}

async function runE2eSmoke(window: BrowserWindow) {
  try {
    await window.webContents.executeJavaScript(`window.open('/sg/login', '_blank', 'popup,width=1120,height=780')`)
    await new Promise((resolveWait) => setTimeout(resolveWait, 750))
    const childWindow = BrowserWindow.getAllWindows().find((candidate) => candidate !== window)
    const result = await window.webContents.executeJavaScript(`JSON.stringify({
      title: document.title,
      href: window.location.href,
      apiBaseUrl: window.cxsunDesktop?.apiBaseUrl ?? null,
      childWindowCount: ${BrowserWindow.getAllWindows().length - 1},
      childWindowUrl: ${JSON.stringify(childWindow?.webContents.getURL() ?? null)}
    })`)
    console.log(`CXSun desktop e2e smoke: ${result}`)
    app.exit(0)
  } catch (error) {
    console.error('CXSun desktop e2e smoke failed.', error)
    app.exit(1)
  }
}

async function applicationUrl() {
  if (developmentUrl) return developmentUrl

  const frontendRoot = packagedFrontendRoot()
  if (!existsSync(resolve(frontendRoot, 'index.html'))) {
    throw new Error(`The packaged frontend was not found at ${frontendRoot}. Run the desktop build command first.`)
  }

  frontendServer = createServer((request, response) => {
    void serveFrontend(frontendRoot, request.url ?? '/', response)
  })

  await new Promise<void>((resolveReady, reject) => {
    frontendServer?.once('error', reject)
    frontendServer?.listen(0, loopbackHost, resolveReady)
  })

  const address = frontendServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('The desktop frontend server did not expose a local port.')
  }

  const hostCheck = await desktopHostResolvesToLoopback()
  if (hostCheck.ok) {
    return `http://${desktopHost}:${address.port}`
  }

  const diagnosticsUrl = new URL(`http://${loopbackHost}:${address.port}`)
  diagnosticsUrl.searchParams.set('desktopHostStatus', 'missing')
  diagnosticsUrl.searchParams.set('desktopHost', desktopHost)
  diagnosticsUrl.searchParams.set('desktopExpectedAddress', loopbackHost)
  return diagnosticsUrl.toString()
}

function packagedFrontendRoot() {
  return app.isPackaged
    ? resolve(process.resourcesPath, 'frontend')
    : resolve(packageRoot, '../../build/frontend')
}

async function serveFrontend(frontendRoot: string, rawUrl: string, response: import('node:http').ServerResponse) {
  try {
    const pathname = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1').pathname)
    const requestedPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const candidate = resolve(frontendRoot, requestedPath)
    const safeCandidate = candidate === frontendRoot || candidate.startsWith(`${frontendRoot}${sep}`)
      ? candidate
      : resolve(frontendRoot, 'index.html')
    const filePath = await existingFile(safeCandidate) ?? resolve(frontendRoot, 'index.html')
    const body = await readFile(filePath)

    response.writeHead(200, {
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Type': contentType(filePath),
      'Content-Length': body.byteLength,
    })
    response.end(body)
  } catch (error) {
    console.error('Unable to serve the desktop frontend.', error)
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('CXSun desktop could not load its local application files.')
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
  const types: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }

  return types[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

function isApplicationUrl(nextUrl: string, currentUrl: string) {
  try {
    return new URL(nextUrl).origin === new URL(currentUrl).origin
  } catch {
    return false
  }
}

async function openExternalUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (allowedExternalProtocols.has(parsed.protocol)) await shell.openExternal(url)
  } catch {
    // Ignore malformed URLs requested by untrusted renderer content.
  }
}

async function desktopHostResolvesToLoopback() {
  try {
    const records = await lookup(desktopHost, { all: true })
    const addresses = records.map((record) => record.address)
    return {
      ok: addresses.some((address) => address === loopbackHost || address === '::1'),
      addresses,
    }
  } catch {
    return { ok: false, addresses: [] }
  }
}
