import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { BillingApiModule } from './billing-api.module.js'

export interface BillingApiRuntimeOptions {
  port?: number
}

export interface BillingApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveBillingApiPort(value = process.env.BILLING_API_PORT) {
  return resolveApiPort(value, 'BILLING_API_PORT', 6205)
}

export async function createBillingApiRuntime(options: BillingApiRuntimeOptions = {}): Promise<BillingApiRuntime> {
  const port = options.port ?? resolveBillingApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(BillingApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startBillingApi(options: BillingApiRuntimeOptions = {}) {
  const runtime = await createBillingApiRuntime(options)
  await runtime.app.start()
  return runtime
}
