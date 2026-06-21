#!/usr/bin/env node

import { execSync, spawn, spawnSync } from 'child_process'
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
  frontend: { cwd: 'apps/frontend', envKey: 'VITE_PORT', port: 6010, kind: 'vite' },
  docs: { cwd: 'apps/docs', envKey: 'PORT', port: 6020, kind: 'docs' },
  auditor: { cwd: 'apps/auditor', envKey: 'VITE_PORT', port: 6030, kind: 'vite' },
  ecommerce: { cwd: 'apps/ecommerce', envKey: 'VITE_PORT', port: 6031, kind: 'vite' },
  'b2b-connect': { cwd: 'apps/b2b-connect', envKey: 'VITE_PORT', port: 6032, kind: 'vite' },
  'b2b-connect-admin': { cwd: 'apps/b2b-connect-admin', envKey: 'VITE_PORT', port: 6043, kind: 'vite' },
  sports: { cwd: 'apps/sports', envKey: 'VITE_PORT', port: 6033, kind: 'vite' },
  learning: { cwd: 'apps/learning', envKey: 'VITE_PORT', port: 6034, kind: 'vite' },
  welfare: { cwd: 'apps/welfare', envKey: 'VITE_PORT', port: 6035, kind: 'vite' },
  crm: { cwd: 'apps/crm', envKey: 'VITE_PORT', port: 6036, kind: 'vite' },
  sites: { cwd: 'apps/sites', envKey: 'VITE_PORT', port: 6037, kind: 'vite' },
  blog: { cwd: 'apps/blog', envKey: 'VITE_PORT', port: 6038, kind: 'vite' },
  zetro: { cwd: 'apps/zetro', envKey: 'VITE_PORT', port: 6039, kind: 'vite' },
  'textile-lab': { cwd: 'apps/textile-lab', envKey: 'VITE_PORT', port: 6040, kind: 'vite' },
  garment: { cwd: 'apps/garment', envKey: 'VITE_PORT', port: 6041, kind: 'vite' },
  upvc: { cwd: 'apps/upvc', envKey: 'VITE_PORT', port: 6042, kind: 'vite' },
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

function isPortInUse(port) {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr "\\<${port}\\>" | findstr LISTENING`
      : `lsof -ti :${port} 2>/dev/null || ss -tlnp | grep ":${port} "`
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function getPidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr "\\<${port}\\>" | findstr LISTENING`, { encoding: 'utf8' })
      return Array.from(new Set(out.split(/\r?\n/).filter(Boolean).map((line) => Number(line.trim().split(/\s+/).pop())).filter(Boolean)))
    }
    const out = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf8' })
    return Array.from(new Set(out.split(/\s+/).map(Number).filter(Boolean)))
  } catch {
    return []
  }
}

function killPid(pid) {
  const command = process.platform === 'win32' ? `taskkill /pid ${pid} /t /f` : `kill -TERM ${pid}`
  execSync(command, { stdio: 'pipe' })
}

async function freePort(port) {
  console.log(`  - Checking port ${port}`)
  if (!isPortInUse(port)) return
  const pids = getPidsOnPort(port)
  console.log(`\n  ! Port ${port} is already in use${pids.length ? ` (PID ${pids.join(', ')})` : ''}`)

  if (process.stdin.isTTY && process.env.CXSUN_DEV_PORT_POLICY !== 'kill') {
    const answer = await ask('     (K)ill and restart | (A)bort [K/a]: ')
    const choice = answer.trim().toLowerCase() || 'k'
    if (choice !== 'k' && choice !== 'kill') {
      console.log('  Cancelled.\n')
      process.exit(1)
    }
  }

  if (!pids.length) {
    console.error(`  x Could not find PID for port ${port}. Stop it manually and retry.\n`)
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
  console.log('')
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
  if (APP === 'server') return
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

  if (config.kind === 'docs') {
    return { command: binCommand('docusaurus'), args: ['start', '--host', '0.0.0.0', '--port', String(port)] }
  }

  return { command: binCommand('vite'), args: ['--host', '0.0.0.0', '--port', String(port), '--strictPort'] }
}

const env = loadDotEnv()
const port = (config.kind === 'vite' && APP !== 'frontend') || config.kind === 'docs'
  ? config.port
  : Number(process.env[config.envKey] || env[config.envKey]) || config.port

if (APP === 'server') await checkServerDatabase(env)
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
