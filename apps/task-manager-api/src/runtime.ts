import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { TaskManagerApiModule } from './task-manager-api.module.js'

export interface TaskManagerApiRuntimeOptions {
  port?: number
}

export interface TaskManagerApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveTaskManagerApiPort(value = process.env.TASK_MANAGER_API_PORT) {
  return resolveApiPort(value, 'TASK_MANAGER_API_PORT', 6535)
}

export async function createTaskManagerApiRuntime(options: TaskManagerApiRuntimeOptions = {}): Promise<TaskManagerApiRuntime> {
  const port = options.port ?? resolveTaskManagerApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(TaskManagerApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startTaskManagerApi(options: TaskManagerApiRuntimeOptions = {}) {
  const runtime = await createTaskManagerApiRuntime(options)
  await runtime.app.start()
  return runtime
}
