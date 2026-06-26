import 'reflect-metadata'
import type { CxApp } from '@cxsun/platform/core/bootstrap.js'
import { CxApp as ServerApp } from '@cxsun/platform/core/bootstrap.js'
import { localHealthUrl, publicApiUrl, resolveApiPort } from '@cxsun/platform/core/runtime/api-runtime.js'
import { initializeDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { BlogApiModule } from './blog-api.module.js'

export interface BlogApiRuntimeOptions {
  port?: number
}

export interface BlogApiRuntime {
  app: CxApp
  port: number
  url: string
  publicUrl: string
  healthUrl: string
  localHealthUrl: string
}

export function resolveBlogApiPort(value = process.env.BLOG_API_PORT) {
  return resolveApiPort(value, 'BLOG_API_PORT', 6555)
}

export async function createBlogApiRuntime(options: BlogApiRuntimeOptions = {}): Promise<BlogApiRuntime> {
  const port = options.port ?? resolveBlogApiPort()
  await initializeDatabase()
  const app = await ServerApp.create(BlogApiModule, { port })
  return {
    app,
    port,
    url: publicApiUrl(port),
    publicUrl: publicApiUrl(port),
    healthUrl: localHealthUrl(port),
    localHealthUrl: localHealthUrl(port),
  }
}

export async function startBlogApi(options: BlogApiRuntimeOptions = {}) {
  const runtime = await createBlogApiRuntime(options)
  await runtime.app.start()
  return runtime
}
