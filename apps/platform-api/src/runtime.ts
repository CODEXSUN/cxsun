import 'reflect-metadata'
import type { CxApp } from './core/bootstrap.js'
import { CxApp as ServerApp } from './core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from './core/runtime/api-runtime.js'
import { initializeDatabase } from './infrastructure/database/connection.js'
import { PlatformApiModule } from './platform-api.module.js'

export interface PlatformApiRuntimeOptions {
  port?: number
}

export interface PlatformApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolvePlatformApiPort(value = process.env.PLATFORM_API_PORT ?? process.env.CORE_API_PORT) {
  return resolveApiPort(value, 'PLATFORM_API_PORT', 6105)
}

export async function createPlatformApiRuntime(options: PlatformApiRuntimeOptions = {}): Promise<PlatformApiRuntime> {
  const port = options.port ?? resolvePlatformApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(PlatformApiModule, { port })

  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startPlatformApi(options: PlatformApiRuntimeOptions = {}) {
  const runtime = await createPlatformApiRuntime(options)
  await runtime.app.start()
  return runtime
}
