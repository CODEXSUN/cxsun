import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { AgentOsApiModule } from './agent-os-api.module.js'

export interface AgentOsApiRuntimeOptions {
  port?: number
}

export interface AgentOsApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveAgentOsApiPort(value = process.env.AGENT_OS_API_PORT) {
  return resolveApiPort(value, 'AGENT_OS_API_PORT', 6565)
}

export async function createAgentOsApiRuntime(options: AgentOsApiRuntimeOptions = {}): Promise<AgentOsApiRuntime> {
  const port = options.port ?? resolveAgentOsApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(AgentOsApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startAgentOsApi(options: AgentOsApiRuntimeOptions = {}) {
  const runtime = await createAgentOsApiRuntime(options)
  await runtime.app.start()
  return runtime
}
