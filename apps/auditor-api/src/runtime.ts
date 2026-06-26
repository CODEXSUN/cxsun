import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { AuditorApiModule } from './auditor-api.module.js'

export interface AuditorApiRuntimeOptions {
  port?: number
}

export interface AuditorApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveAuditorApiPort(value = process.env.AUDITOR_API_PORT) {
  return resolveApiPort(value, 'AUDITOR_API_PORT', 6545)
}

export async function createAuditorApiRuntime(options: AuditorApiRuntimeOptions = {}): Promise<AuditorApiRuntime> {
  const port = options.port ?? resolveAuditorApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(AuditorApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startAuditorApi(options: AuditorApiRuntimeOptions = {}) {
  const runtime = await createAuditorApiRuntime(options)
  await runtime.app.start()
  return runtime
}
