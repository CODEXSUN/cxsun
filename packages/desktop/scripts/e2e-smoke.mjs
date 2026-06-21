import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const electronBinary = process.platform === 'win32'
  ? resolve(desktopRoot, '../../node_modules/electron/dist/electron.exe')
  : resolve(desktopRoot, '../../node_modules/.bin/electron')
const expectedApiBaseUrl = process.env.ELECTRON_EXPECTED_API_BASE_URL || 'http://codexsun.local:6005'
const expectedAppHost = process.env.ELECTRON_EXPECTED_APP_HOST || 'codexsun.local'
const expectedAppHostStatus = process.env.ELECTRON_EXPECTED_APP_HOST_STATUS || 'ok'

if (!existsSync(resolve(desktopRoot, '../../build/frontend/index.html'))) {
  throw new Error('Frontend build was not found. Run the desktop e2e script through npm so it builds first.')
}

if (!existsSync(electronBinary)) {
  throw new Error(`Electron binary was not found at ${electronBinary}. Run npm install first.`)
}

const child = spawn(electronBinary, ['.'], {
  cwd: desktopRoot,
  env: {
    ...process.env,
    ELECTRON_E2E_SMOKE: '1',
    ELECTRON_API_BASE_URL: process.env.ELECTRON_API_BASE_URL || expectedApiBaseUrl,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

let output = ''
let settled = false

const timeout = setTimeout(() => {
  if (settled) return
  settled = true
  child.kill()
  console.error(output)
  console.error('Electron desktop e2e smoke timed out.')
  process.exit(1)
}, 30_000)

child.stdout.on('data', (chunk) => {
  output += chunk.toString()
})

child.stderr.on('data', (chunk) => {
  output += chunk.toString()
})

child.on('error', (error) => {
  if (settled) return
  settled = true
  clearTimeout(timeout)
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  if (settled) return
  settled = true
  clearTimeout(timeout)

  const marker = output.match(/CXSun desktop e2e smoke: (.+)/)
  if (code !== 0 || !marker) {
    console.error(output)
    console.error(`Electron desktop e2e smoke failed with exit code ${code}.`)
    process.exit(1)
  }

  const payload = JSON.parse(marker[1])
  if (payload.apiBaseUrl !== expectedApiBaseUrl) {
    console.error(output)
    console.error(`Expected Electron API base ${expectedApiBaseUrl}, received ${payload.apiBaseUrl}.`)
    process.exit(1)
  }

  const renderedHost = new URL(payload.href).hostname
  const renderedSearchParams = new URL(payload.href).searchParams
  if (expectedAppHostStatus === 'missing') {
    if (renderedHost !== '127.0.0.1' || renderedSearchParams.get('desktopHostStatus') !== 'missing') {
      console.error(output)
      console.error(`Expected Electron diagnostics fallback for a missing app host, received ${payload.href}.`)
      process.exit(1)
    }
  } else if (renderedHost !== expectedAppHost) {
    console.error(output)
    console.error(`Expected Electron app host ${expectedAppHost}, received ${renderedHost}.`)
    process.exit(1)
  }

  if (payload.childWindowCount < 1 || !payload.childWindowUrl?.endsWith('/sg/login')) {
    console.error(output)
    console.error(`Expected Electron to open /sg/login in a child app window, received ${payload.childWindowUrl}.`)
    process.exit(1)
  }

  console.log(`Electron desktop e2e smoke passed: ${payload.href} -> ${payload.apiBaseUrl}; child=${payload.childWindowUrl}`)
})
