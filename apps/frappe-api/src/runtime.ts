import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { FrappeApiModule } from './frappe-api.module.js'

export interface FrappeApiRuntimeOptions {
  port?: number
}

export interface FrappeApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveFrappeApiPort(value = process.env.FRAPPE_API_PORT) {
  return resolveApiPort(value, 'FRAPPE_API_PORT', 6525)
}

export async function createFrappeApiRuntime(options: FrappeApiRuntimeOptions = {}): Promise<FrappeApiRuntime> {
  const port = options.port ?? resolveFrappeApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(FrappeApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startFrappeApi(options: FrappeApiRuntimeOptions = {}) {
  const runtime = await createFrappeApiRuntime(options)
  await runtime.app.start()
  return runtime
}
