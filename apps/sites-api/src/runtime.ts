import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { SitesApiModule } from './sites-api.module.js'

export interface SitesApiRuntimeOptions {
  port?: number
}

export interface SitesApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveSitesApiPort(value = process.env.SITES_API_PORT) {
  return resolveApiPort(value, 'SITES_API_PORT', 6405)
}

export async function createSitesApiRuntime(options: SitesApiRuntimeOptions = {}): Promise<SitesApiRuntime> {
  const port = options.port ?? resolveSitesApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(SitesApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startSitesApi(options: SitesApiRuntimeOptions = {}) {
  const runtime = await createSitesApiRuntime(options)
  await runtime.app.start()
  return runtime
}
