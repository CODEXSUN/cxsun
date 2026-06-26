import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { TallyApiModule } from './tally-api.module.js'

export interface TallyApiRuntimeOptions {
  port?: number
}

export interface TallyApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveTallyApiPort(value = process.env.TALLY_API_PORT) {
  return resolveApiPort(value, 'TALLY_API_PORT', 6515)
}

export async function createTallyApiRuntime(options: TallyApiRuntimeOptions = {}): Promise<TallyApiRuntime> {
  const port = options.port ?? resolveTallyApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(TallyApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startTallyApi(options: TallyApiRuntimeOptions = {}) {
  const runtime = await createTallyApiRuntime(options)
  await runtime.app.start()
  return runtime
}
