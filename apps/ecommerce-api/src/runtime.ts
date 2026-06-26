import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as PlatformApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { EcommerceApiModule } from './ecommerce-api.module.js'

export interface EcommerceApiRuntimeOptions {
  port?: number
}

export interface EcommerceApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveEcommerceApiPort(value = process.env.ECOMMERCE_API_PORT) {
  return resolveApiPort(value, 'ECOMMERCE_API_PORT', 6305)
}

export async function createEcommerceApiRuntime(options: EcommerceApiRuntimeOptions = {}): Promise<EcommerceApiRuntime> {
  const port = options.port ?? resolveEcommerceApiPort()
  await initializeDatabase()
  const app = await PlatformApp.create(EcommerceApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startEcommerceApi(options: EcommerceApiRuntimeOptions = {}) {
  const runtime = await createEcommerceApiRuntime(options)
  await runtime.app.start()
  return runtime
}
