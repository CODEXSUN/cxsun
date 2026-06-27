#!/usr/bin/env node

import { execFileSync, execSync, spawn, spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { createConnection } from 'mysql2/promise'

const ROOT = resolve(import.meta.dirname, '../..')
const ENV_PATH = resolve(ROOT, '.env')
const DEV_STATE_DIR = resolve(ROOT, 'build', 'dev')
const SERVER_STATE_PATH = resolve(DEV_STATE_DIR, 'server.json')
const APP = process.argv[2]

const APP_CONFIG = {
  server: { cwd: 'apps/server', envKey: 'PORT', port: 6005, kind: 'server' },
  'platform-api': { cwd: 'apps/platform-api', envKey: 'PLATFORM_API_PORT', port: 6105, kind: 'server' },
  'billing-api': { cwd: 'apps/billing-api', envKey: 'BILLING_API_PORT', port: 6205, kind: 'server' },
  'ecommerce-api': { cwd: 'apps/ecommerce-api', envKey: 'ECOMMERCE_API_PORT', port: 6305, kind: 'server' },
  'sites-api': { cwd: 'apps/sites-api', envKey: 'SITES_API_PORT', port: 6405, kind: 'server' },
  'crm-api': { cwd: 'apps/crm-api', envKey: 'CRM_API_PORT', port: 6505, kind: 'server' },
  'tally-api': { cwd: 'apps/tally-api', envKey: 'TALLY_API_PORT', port: 6515, kind: 'server' },
  'frappe-api': { cwd: 'apps/frappe-api', envKey: 'FRAPPE_API_PORT', port: 6525, kind: 'server' },
  'task-manager-api': { cwd: 'apps/task-manager-api', envKey: 'TASK_MANAGER_API_PORT', port: 6535, kind: 'server' },
  'auditor-api': { cwd: 'apps/auditor-api', envKey: 'AUDITOR_API_PORT', port: 6545, kind: 'server' },
  'blog-api': { cwd: 'apps/blog-api', envKey: 'BLOG_API_PORT', port: 6555, kind: 'server' },
  'agent-os-api': { cwd: 'apps/agent-os-api', envKey: 'AGENT_OS_API_PORT', port: 6565, kind: 'server' },
  frontend: { cwd: 'apps/frontend', envKey: 'VITE_PORT', port: 6010, kind: 'vite' },
}

if (!APP || !APP_CONFIG[APP]) {
  console.log(`Usage: node preflight.mjs <${Object.keys(APP_CONFIG).join('|')}>`)
  process.exit(1)
}

const config = APP_CONFIG[APP]
console.log(`\n  > Starting ${APP} dev preflight`)

function loadDotEnv() {
  if (!existsSync(ENV_PATH)) return {}
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  )
}

function parseEnvValue(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1)
  return trimmed.replace(/\s+#.*$/, '').trim()
}

function setDotEnvValue(key, value) {
  if (!existsSync(ENV_PATH)) return
  const lines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
  const index = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}\\s*=`)))
  if (index >= 0) lines[index] = `${key}=${value}`
  else lines.push(`${key}=${value}`)
  writeFileSync(ENV_PATH, lines.join('\n'))
}

function writeServerState(port) {
  mkdirSync(DEV_STATE_DIR, { recursive: true })
  writeFileSync(SERVER_STATE_PATH, JSON.stringify({
    port,
    apiBaseUrl: `http://localhost:${port}`,
    healthUrl: `http://localhost:${port}/health`,
    updatedAt: new Date().toISOString(),
  }, null, 2))
}

function readServerState(maxAgeMs = 60_000) {
  if (!existsSync(SERVER_STATE_PATH)) return null
  try {
    const ageMs = Date.now() - statSync(SERVER_STATE_PATH).mtimeMs
    if (ageMs > maxAgeMs) return null
    const state = JSON.parse(readFileSync(SERVER_STATE_PATH, 'utf8'))
    const port = Number(state.port)
    if (!Number.isInteger(port) || port <= 0) return null
    return { port, apiBaseUrl: String(state.apiBaseUrl || `http://localhost:${port}`) }
  } catch {
    return null
  }
}

function getPidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      return Array.from(new Set(
        out
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/))
          .filter((parts) => parts.length >= 5 && parts[3] === 'LISTENING' && portFromAddress(parts[1]) === port)
          .map((parts) => Number(parts[4]))
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
      ))
    }
    const out = execFileSync('lsof', ['-ti', `:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return Array.from(new Set(
      out
        .split(/\s+/)
        .map(Number)
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
    ))
  } catch {
    return []
  }
}

function portFromAddress(address) {
  const match = String(address).match(/:(\d+)$/)
  return match ? Number(match[1]) : null
}

function killPid(pid) {
  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return
  }
  process.kill(pid, 'SIGTERM')
}

async function freePort(port) {
  console.log(`  - Checking port ${port}`)
  const pids = getPidsOnPort(port)
  if (!pids.length) return
  console.log(`\n  ! Port ${port} is already in use${pids.length ? ` (PID ${pids.join(', ')})` : ''}`)

  if (process.env.CXSUN_DEV_PORT_POLICY === 'abort') {
    console.error(`  x Port policy is abort. Stop PID ${pids.join(', ')} or change CXSUN_DEV_PORT_POLICY.\n`)
    process.exit(1)
  }

  for (const pid of pids) {
    try {
      killPid(pid)
      console.log(`  ok Killed PID ${pid}`)
    } catch (error) {
      console.error(`  x Could not kill PID ${pid}: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!getPidsOnPort(port).length) {
      console.log(`  ok Port ${port} is ready for restart\n`)
      return
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }

  console.error(`  x Port ${port} was not released after stopping PID ${pids.join(', ')}.\n`)
  process.exit(1)
}

function ask(query) {
  return new Promise((resolveAnswer) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, (answer) => {
      rl.close()
      resolveAnswer(answer)
    })
  })
}

async function waitForServerState(env) {
  if (config.kind === 'server') return
  if (process.argv.includes('--skip-api-wait')) {
    const requiredServicesArg = process.argv.find((arg) => arg.startsWith('--required-api-services='))
    env.VITE_API_BASE_URL ||= process.env.VITE_API_BASE_URL || 'http://localhost:6005'
    env.VITE_PLATFORM_API_BASE_URL ||= process.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:6105'
    env.VITE_BILLING_API_BASE_URL ||= process.env.VITE_BILLING_API_BASE_URL || 'http://localhost:6205'
    env.VITE_SITES_API_BASE_URL ||= process.env.VITE_SITES_API_BASE_URL || 'http://localhost:6405'
    env.VITE_CRM_API_BASE_URL ||= process.env.VITE_CRM_API_BASE_URL || 'http://localhost:6505'
    env.VITE_TALLY_API_BASE_URL ||= process.env.VITE_TALLY_API_BASE_URL || 'http://localhost:6515'
    env.VITE_FRAPPE_API_BASE_URL ||= process.env.VITE_FRAPPE_API_BASE_URL || 'http://localhost:6525'
    env.VITE_TASK_MANAGER_API_BASE_URL ||= process.env.VITE_TASK_MANAGER_API_BASE_URL || 'http://localhost:6535'
    env.VITE_AUDITOR_API_BASE_URL ||= process.env.VITE_AUDITOR_API_BASE_URL || 'http://localhost:6545'
    env.VITE_BLOG_API_BASE_URL ||= process.env.VITE_BLOG_API_BASE_URL || 'http://localhost:6555'
    env.VITE_AGENT_OS_API_BASE_URL ||= process.env.VITE_AGENT_OS_API_BASE_URL || 'http://localhost:6565'
    env.VITE_REQUIRED_API_SERVICES ||= process.env.VITE_REQUIRED_API_SERVICES || requiredServicesArg?.split('=').slice(1).join('=') || 'platform,billing,sites'
    env.VITE_REQUIRE_EXTRACTED_SERVICES = 'true'
    console.log(`  - Skipping backend announcement wait; fallback API target: ${env.VITE_API_BASE_URL}`)
    console.log(`  - Platform API target: ${env.VITE_PLATFORM_API_BASE_URL}`)
    console.log(`  - Billing API target: ${env.VITE_BILLING_API_BASE_URL}`)
    console.log(`  - Sites API target: ${env.VITE_SITES_API_BASE_URL}`)
    console.log(`  - Required service health checks: ${env.VITE_REQUIRED_API_SERVICES}`)
    return
  }
  if (process.env.VITE_API_BASE_URL) {
    console.log(`  - API target from environment: ${process.env.VITE_API_BASE_URL}`)
    return
  }

  console.log('  - Waiting for backend API target')
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const state = readServerState()
    if (state) {
      env.VITE_API_BASE_URL = state.apiBaseUrl
      console.log(`  ok API target: ${state.apiBaseUrl}`)
      return
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  env.VITE_API_BASE_URL = 'http://localhost:6005'
  console.log(`  ! API target not announced yet. Using ${env.VITE_API_BASE_URL}`)
}

function tsxCommand() {
  return resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
}

function binCommand(name) {
  return resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)
}

function databaseConfig(env) {
  return {
    host: env.DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || process.env.DB_PORT || 3306),
    database: env.DB_NAME || process.env.DB_NAME || 'cxsun_master',
    user: env.DB_USER || process.env.DB_USER || 'root',
    password: env.DB_PASSWORD || process.env.DB_PASSWORD || '',
  }
}

function isValidDatabaseName(name) {
  return /^[a-zA-Z0-9_]+$/.test(name)
}

async function checkServerDatabase(env) {
  const db = databaseConfig(env)
  let connection

  try {
    connection = await createConnection({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      multipleStatements: false,
      connectTimeout: 2_000,
    })
  } catch (error) {
    console.error(`\n  x MariaDB connection failed at ${db.host}:${db.port}`)
    console.error(`    ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }

  try {
    const [databaseRows] = await connection.query('SHOW DATABASES LIKE ?', [db.database])
    const databaseExists = Array.isArray(databaseRows) && databaseRows.length > 0
    let tableCount = 0

    if (databaseExists) {
      const [tableRows] = await connection.query(
        'SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = ?',
        [db.database],
      )
      tableCount = Number(tableRows?.[0]?.table_count ?? 0)
    }

    if (databaseExists && tableCount > 0) {
      console.log(`  ok Master database ready: ${db.database} (${tableCount} tables)`)
      return
    }

    const reason = databaseExists ? `Master database "${db.database}" has no tables.` : `Master database "${db.database}" does not exist.`
    console.log(`\n  ${reason}`)

    let databaseName = db.database
    if (process.stdin.isTTY) {
      const createAnswer = await ask('     Create/setup master and tenant now? (Y/n): ')
      const createChoice = createAnswer.trim().toLowerCase() || 'y'
      if (createChoice !== 'y' && createChoice !== 'yes') {
        console.log('  Cancelled database setup.\n')
        process.exit(1)
      }
      const nameAnswer = await ask(`     Database name [${db.database}]: `)
      databaseName = nameAnswer.trim() || db.database
    } else {
      console.log(`  Non-interactive dev startup - setting up "${databaseName}" automatically.`)
    }

    if (!isValidDatabaseName(databaseName)) {
      console.error('  x Database name can contain only letters, numbers, and underscores.\n')
      process.exit(1)
    }

    env.DB_NAME = databaseName
    if (databaseName !== db.database) setDotEnvValue('DB_NAME', databaseName)

    console.log(`  Setting up ${databaseName} master database...\n`)
    const setup = spawnSync(`"${tsxCommand()}"`, ['src/core/migration-manager/cli.ts', 'setup', '--target=master'], {
      cwd: resolve(ROOT, 'apps/server'),
      env: { ...process.env, ...env, DB_NAME: databaseName },
      shell: true,
      stdio: 'inherit',
    })

    if (setup.status !== 0) {
      console.error('\n  x Database setup failed.\n')
      process.exit(setup.status ?? 1)
    }

    console.log(`\n  ok Database setup completed: ${databaseName}\n`)
  } finally {
    await connection.end()
  }
}

function commandForApp(port) {
  if (config.kind === 'server') {
    return { command: tsxCommand(), args: ['watch', 'src/main.ts'] }
  }

  return { command: binCommand('vite'), args: ['--host', '0.0.0.0', '--port', String(port), '--strictPort'] }
}

const env = loadDotEnv()
const port = Number(process.env[config.envKey] || env[config.envKey]) || config.port

if (config.kind === 'server') await checkServerDatabase(env)
await freePort(port)
if (APP === 'server') {
  console.log(`  - Announcing backend API at http://localhost:${port}`)
  writeServerState(port)
}
else await waitForServerState(env)

const { command, args } = commandForApp(port)
const launch = launchCommand(command, args)
console.log(`  - Launching ${APP} on port ${port}`)
console.log(`  - Command: ${launch.command}${launch.args.length ? ` ${launch.args.join(' ')}` : ''}\n`)
const child = spawn(launch.command, launch.args, {
  cwd: resolve(ROOT, config.cwd),
  env: { ...process.env, ...env, [config.envKey]: String(port) },
  shell: launch.shell,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))

function launchCommand(command, args) {
  if (process.platform !== 'win32') return { command, args, shell: false }
  return {
    args: [],
    command: [quoteWindowsArg(command), ...args.map(quoteWindowsArg)].join(' '),
    shell: true,
  }
}

function quoteWindowsArg(value) {
  const text = String(value)
  if (!/[ \t"]/u.test(text)) return text
  return `"${text.replace(/"/g, '\\"')}"`
}
