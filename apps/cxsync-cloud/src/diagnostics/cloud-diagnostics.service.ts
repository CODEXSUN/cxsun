import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { sql } from 'kysely'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import { getDatabase } from '../../../server/src/infrastructure/database/connection.js'

export type DiagnosticCheck = { detail: string; id: string; label: string; recommendation: string | null; status: 'pass' | 'warning' | 'fail' }
export type CloudDiagnostics = {
  checkedAt: string
  checks: DiagnosticCheck[]
  database: { activeTenants: number | null; missingTenantDatabases: number | null; recordedPlatformVersion: string | null; serverVersion: string | null }
  deployment: { cloneEnabled: boolean; expectedVersion: string | null; packageVersion: string; runtimeMode: string }
  overall: 'healthy' | 'warning' | 'unhealthy'
  service: 'cxsync-cloud'
}

@Injectable()
export class CloudDiagnosticsService {
  async inspect(): Promise<CloudDiagnostics> {
    const checks: DiagnosticCheck[] = []
    const packageVersion = await runningPackageVersion()
    const expectedVersion = process.env.CXSYNC_EXPECTED_VERSION?.trim() || null
    const runtimeMode = process.env.CXSUN_RUNTIME_MODE?.trim() || 'application'
    checks.push(check('release-version', 'Release version', !expectedVersion || expectedVersion === packageVersion ? 'pass' : 'fail', expectedVersion ? `Running ${packageVersion}; expected ${expectedVersion}.` : `Running ${packageVersion}; no expected release is configured.`, expectedVersion && expectedVersion !== packageVersion ? 'Deploy the expected Git release before any database maintenance operation.' : null))
    checks.push(check('runtime-isolation', 'Maintenance runtime isolation', runtimeMode === 'cxsync-maintenance' ? 'pass' : 'warning', `Runtime mode is ${runtimeMode}.`, runtimeMode === 'cxsync-maintenance' ? null : 'Use the isolated setup-cxsync-maintenance.sh deployment path on production.'))

    let serverVersion: string | null = null
    let recordedPlatformVersion: string | null = null
    let activeTenants: number | null = null
    let missingTenantDatabases: number | null = null
    try {
      const version = await withTimeout(sql<{ version: string }>`SELECT VERSION() AS version`.execute(getDatabase()), 8_000, 'MariaDB connection check timed out.')
      serverVersion = version.rows[0]?.version ?? null
      checks.push(check('master-database', 'Master MariaDB connection', 'pass', `MariaDB ${serverVersion ?? 'version unavailable'} answered successfully.`, null))
    } catch (reason) {
      checks.push(check('master-database', 'Master MariaDB connection', 'fail', safeError(reason), 'Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, Docker network membership, and MariaDB availability.'))
    }

    if (serverVersion) {
      try {
        const version = await withTimeout(sql<{ version: string }>`SELECT version FROM db_versions WHERE scope = 'master' ORDER BY updated_at DESC LIMIT 1`.execute(getDatabase()), 8_000, 'Platform version check timed out.')
        recordedPlatformVersion = version.rows[0]?.version ?? null
        const aligned = recordedPlatformVersion === packageVersion
        checks.push(check('platform-version', 'Recorded platform database version', aligned ? 'pass' : 'warning', recordedPlatformVersion ? `Master database records ${recordedPlatformVersion}; CXSync code is ${packageVersion}.` : 'No master platform version record was found.', aligned ? null : 'Do not run the full application reinstall blindly. Audit migrations and rehearse them against a candidate database first.'))
      } catch (reason) {
        checks.push(check('platform-version', 'Recorded platform database version', 'warning', safeError(reason), 'Confirm the existing master schema and db_versions table before deployment.'))
      }

      try {
        const result = await withTimeout(sql<{ active_tenants: number; missing_databases: number }>`
          SELECT COUNT(*) AS active_tenants,
                 SUM(CASE WHEN s.SCHEMA_NAME IS NULL THEN 1 ELSE 0 END) AS missing_databases
          FROM tenants t
          LEFT JOIN information_schema.SCHEMATA s ON s.SCHEMA_NAME = t.db_name
          WHERE t.status = 'active' AND t.deleted_at IS NULL AND t.db_type = 'mariadb'
        `.execute(getDatabase()), 10_000, 'Tenant database visibility check timed out.')
        activeTenants = Number(result.rows[0]?.active_tenants ?? 0)
        missingTenantDatabases = Number(result.rows[0]?.missing_databases ?? 0)
        checks.push(check('tenant-databases', 'Active tenant database visibility', missingTenantDatabases === 0 ? 'pass' : 'fail', `${activeTenants} active MariaDB tenant(s); ${missingTenantDatabases} database(s) missing or invisible.`, missingTenantDatabases ? 'Repair tenant registry/database mapping or database-user visibility before migration.' : null))
      } catch (reason) {
        checks.push(check('tenant-databases', 'Active tenant database visibility', 'fail', safeError(reason), 'Verify the tenants table schema and MariaDB information_schema permissions.'))
      }
    }

    const storageRoot = resolve(process.cwd(), 'storage', 'cxsync')
    try {
      await access(storageRoot, constants.R_OK | constants.W_OK)
      checks.push(check('storage', 'CXSync evidence storage', 'pass', 'CXSync storage is readable and writable.', null))
    } catch {
      checks.push(check('storage', 'CXSync evidence storage', 'fail', `Storage is unavailable at ${storageRoot}.`, 'Verify the cxsync-maintenance-storage volume mount and directory permissions.'))
    }

    const dumpTool = process.env.CXSYNC_FLEET_DUMP_PATH?.trim() || 'mariadb-dump'
    const clientTool = process.env.CXSYNC_FLEET_CLIENT_PATH?.trim() || 'mariadb'
    checks.push(await toolCheck('dump-tool', 'MariaDB dump tool', dumpTool))
    checks.push(await toolCheck('client-tool', 'MariaDB client tool', clientTool))

    const cloneEnabled = process.env.CXSYNC_FLEET_CLONE_ENABLED === 'true' && process.env.CXSYNC_FLEET_SOURCE_QUIESCED === 'true'
    checks.push(check('clone-lock', 'Fleet clone safety lock', cloneEnabled ? 'warning' : 'pass', cloneEnabled ? 'Clone execution and source-quiesced flags are both enabled.' : 'Clone execution remains locked.', cloneEnabled ? 'Disable both flags outside an explicitly approved canary maintenance window.' : null))

    return {
      checkedAt: new Date().toISOString(),
      checks,
      database: { activeTenants, missingTenantDatabases, recordedPlatformVersion, serverVersion },
      deployment: { cloneEnabled, expectedVersion, packageVersion, runtimeMode },
      overall: checks.some((item) => item.status === 'fail') ? 'unhealthy' : checks.some((item) => item.status === 'warning') ? 'warning' : 'healthy',
      service: 'cxsync-cloud',
    }
  }
}

function check(id: string, label: string, status: DiagnosticCheck['status'], detail: string, recommendation: string | null): DiagnosticCheck { return { detail, id, label, recommendation, status } }
function safeError(reason: unknown) { return reason instanceof Error ? reason.message.replace(/password=[^\s,;]+/gi, 'password=[redacted]').slice(0, 500) : 'The check failed.' }
function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) { return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds))]) }
async function runningPackageVersion() { try { const parsed = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8')) as { version?: string }; return parsed.version?.trim() || 'unknown' } catch { return process.env.npm_package_version?.trim() || 'unknown' } }

async function toolCheck(id: string, label: string, tool: string): Promise<DiagnosticCheck> {
  try {
    const version = await toolVersion(tool)
    return check(id, label, 'pass', version, null)
  } catch (reason) {
    return check(id, label, 'fail', safeError(reason), `Install the MariaDB client tools or correct the configured ${id === 'dump-tool' ? 'CXSYNC_FLEET_DUMP_PATH' : 'CXSYNC_FLEET_CLIENT_PATH'}.`)
  }
}

function toolVersion(tool: string) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(tool, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let output = ''
    let settled = false
    const finish = (error?: Error, value?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      error ? reject(error) : resolvePromise(value || `${tool} is available.`)
    }
    const timer = setTimeout(() => { child.kill(); finish(new Error(`${tool} version check timed out.`)) }, 5_000)
    child.stdout.on('data', (chunk) => { if (output.length < 500) output += String(chunk) })
    child.stderr.on('data', (chunk) => { if (output.length < 500) output += String(chunk) })
    child.on('error', (error) => finish(error))
    child.on('close', (code) => code === 0 ? finish(undefined, output.trim().slice(0, 300)) : finish(new Error(`${tool} exited with code ${code}.`)))
  })
}
