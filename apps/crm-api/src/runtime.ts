import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { CrmApiModule } from './crm-api.module.js'

export interface CrmApiRuntimeOptions {
  port?: number
}

export interface CrmApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveCrmApiPort(value = process.env.CRM_API_PORT) {
  return resolveApiPort(value, 'CRM_API_PORT', 6505)
}

export async function createCrmApiRuntime(options: CrmApiRuntimeOptions = {}): Promise<CrmApiRuntime> {
  const port = options.port ?? resolveCrmApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(CrmApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startCrmApi(options: CrmApiRuntimeOptions = {}) {
  const runtime = await createCrmApiRuntime(options)
  await runtime.app.start()
  return runtime
}
