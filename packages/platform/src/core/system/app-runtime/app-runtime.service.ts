import { execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import net from 'net'
import { resolve } from 'path'

import { BadRequestException } from '../../exceptions/http.exception.js'
import { runtimeApps, type RuntimeAppDefinition } from './app-runtime.registry.js'

export interface RuntimeAppStatus extends RuntimeAppDefinition {
  localUrl: string
  managed: boolean
  running: boolean
  startable: boolean
  startedAt?: string
}

const startedProcesses = new Map<string, { pid?: number; startedAt: string }>()

export class AppRuntimeService {
  async list(): Promise<{ apps: RuntimeAppStatus[] }> {
    const apps = await Promise.all(runtimeApps.map((app) => this.statusFor(app)))
    return { apps }
  }

  async start(appId: string): Promise<{ app: RuntimeAppStatus; message: string }> {
    const app = runtimeApps.find((item) => item.id === appId)
    if (!app) throw new BadRequestException(`Unknown app: ${appId}`)
    if (!app.script) throw new BadRequestException(`${app.name} cannot be started from this desk.`)

    const current = await this.statusFor(app)
    if (current.running) {
      return { app: current, message: `${app.name} is already running.` }
    }

    const child = await startDetachedNpmScript(app.script)
    const startedAt = new Date().toISOString()
    startedProcesses.set(app.id, { pid: child.pid, startedAt })

    return { app: await this.statusFor(app), message: `${app.name} start requested.` }
  }

  async stop(appId: string): Promise<{ app: RuntimeAppStatus; message: string }> {
    const app = runtimeApps.find((item) => item.id === appId)
    if (!app) throw new BadRequestException(`Unknown app: ${appId}`)
    const tracked = startedProcesses.get(app.id)
    if (!tracked?.pid) throw new BadRequestException(`${app.name} was not started from this desk.`)

    await stopProcessTree(tracked.pid)
    startedProcesses.delete(app.id)
    return { app: await this.statusFor(app), message: `${app.name} stop requested.` }
  }

  async restart(appId: string): Promise<{ app: RuntimeAppStatus; message: string }> {
    const app = runtimeApps.find((item) => item.id === appId)
    if (!app) throw new BadRequestException(`Unknown app: ${appId}`)
    if (!app.script) throw new BadRequestException(`${app.name} cannot be restarted from this desk.`)

    const tracked = startedProcesses.get(app.id)
    if (tracked?.pid) {
      await stopProcessTree(tracked.pid)
    } else {
      await stopPortListeners(app.port)
    }
    startedProcesses.delete(app.id)
    await waitForPortToClose(app.port)

    const child = await startDetachedNpmScript(app.script)
    const startedAt = new Date().toISOString()
    startedProcesses.set(app.id, { pid: child.pid, startedAt })

    return { app: await this.statusFor(app), message: `${app.name} restart requested.` }
  }

  private async statusFor(app: RuntimeAppDefinition): Promise<RuntimeAppStatus> {
    const running = await isPortOpen(app.port)
    return {
      ...app,
      localUrl: `http://localhost:${app.port}${app.route}`,
      managed: startedProcesses.has(app.id),
      running,
      startable: Boolean(app.script),
      startedAt: startedProcesses.get(app.id)?.startedAt,
    }
  }
}

function startDetachedNpmScript(script: string) {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm'
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${script}`] : ['run', script]

  return new Promise<ReturnType<typeof spawn>>((resolveStart, rejectStart) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(command, args, {
        cwd: workspaceRoot(),
        detached: true,
        env: process.env,
        stdio: 'ignore',
        windowsHide: true,
      })
    } catch (error) {
      rejectStart(toStartError(script, error))
      return
    }

    child.once('error', (error) => rejectStart(toStartError(script, error)))
    child.once('spawn', () => {
      child.unref()
      resolveStart(child)
    })
  })
}

function toStartError(script: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return new BadRequestException(`Unable to start ${script}. ${message}`)
}

function isPortOpen(port: number) {
  return new Promise<boolean>((resolveStatus) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(650)
    socket.once('connect', () => {
      socket.destroy()
      resolveStatus(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolveStatus(false)
    })
    socket.once('error', () => resolveStatus(false))
  })
}

function workspaceRoot() {
  let current = process.cwd()
  for (let index = 0; index < 6; index += 1) {
    if (existsSync(resolve(current, 'package.json')) && existsSync(resolve(current, 'apps'))) {
      return current
    }
    current = resolve(current, '..')
  }
  return resolve(process.cwd(), '../..')
}

function stopProcessTree(pid: number) {
  return new Promise<void>((resolveStop, rejectStop) => {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], (error) => {
        if (error) rejectStop(error)
        else resolveStop()
      })
      return
    }

    try {
      process.kill(-pid, 'SIGTERM')
      resolveStop()
    } catch (error) {
      rejectStop(error)
    }
  })
}

async function stopPortListeners(port: number) {
  const pids = await listeningPids(port)
  await Promise.all([...new Set(pids)].map((pid) => stopProcessTree(pid).catch(() => undefined)))
}

function listeningPids(port: number) {
  if (process.platform === 'win32') {
    const command = [
      `$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue;`,
      '$connections | Select-Object -ExpandProperty OwningProcess -Unique',
    ].join(' ')
    return execFileText('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]).then(parsePidLines)
  }

  return execFileText('sh', ['-c', `lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null || true`]).then(parsePidLines)
}

function parsePidLines(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0)
}

function execFileText(command: string, args: string[]) {
  return new Promise<string>((resolveExec) => {
    execFile(command, args, { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolveExec('')
        return
      }
      resolveExec(String(stdout ?? ''))
    })
  })
}

async function waitForPortToClose(port: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await isPortOpen(port))) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
}
