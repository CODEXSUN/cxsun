import 'reflect-metadata'
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import { randomUUID } from 'node:crypto'

import { Container, type ClassProvider } from './container.js'
import {
  CONTROLLER_PREFIX_KEY,
  CONTROLLER_ROUTES_KEY,
  type RouteDefinition,
} from './decorators/controller.js'
import { MODULE_METADATA_KEY, type ModuleMetadata } from './decorators/module.js'
import { PARAM_METADATA_KEY, type ParamDefinition } from './decorators/http-params.js'
import { GUARDS_KEY } from './decorators/guards.js'
import { FILTERS_KEY } from './decorators/filters.js'
import type { CanActivate } from './interfaces/guard.interface.js'
import type { ExceptionFilter } from './interfaces/filter.interface.js'
import { HttpException } from './exceptions/http.exception.js'
import { getCompatibleMetadata } from './metadata.js'
import { sanitizeRequestParts } from './security/request-sanitizer.js'
import { settings } from '../framework/config/index.js'

const corsAllowedHeaders = [
  'Authorization',
  'Content-Type',
  'Accept',
  'Origin',
  'x-tenant-code',
  'x-user-email',
  'x-login-domain',
  'x-user-role',
  'x-zetro-audience',
  'x-frappe-site-name',
  'x-tc-signature',
  'x-tc-timestamp',
  'x-tc-idempotency-key',
  'x-requested-with',
  'x-cxsync-service-key',
  'x-cxsync-cloud-admin-token',
]

const corsExposedHeaders = [
  'Content-Disposition',
  'Content-Length',
  'Content-Type',
  'x-request-id',
]

const corsMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const authRateLimitWindowMs = 60_000
const authRateLimitMaxAttempts = 12
const authRateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

export interface AppOptions {
  host?: string
  port?: number
  logLevel?: string
  gracePeriodMs?: number
  version?: string
}

export class CxApp {
  private readonly host: string
  private readonly port: number

  private constructor(
    public readonly app: FastifyInstance,
    public readonly container: Container,
    private readonly gracePeriodMs: number,
    host: string,
    port: number,
  ) {
    this.host = host
    this.port = port
  }

  static async create(
    moduleClass: ClassProvider,
    options: AppOptions = {},
  ): Promise<CxApp> {
    const host = options.host ?? settings.server.host
    const port = options.port ?? settings.server.port
    const logLevel = options.logLevel ?? settings.server.logLevel
    const gracePeriodMs = options.gracePeriodMs ?? 5_000

    validateRuntimeEnvironment()

    const app = Fastify({
      bodyLimit: settings.server.bodyLimitBytes,
      disableRequestLogging: true,
      logger: loggerOptions(logLevel),
    })
    const container = new Container()

    await app.register(cors, {
      origin: resolveCorsOrigin,
      credentials: true,
      allowedHeaders: corsAllowedHeaders,
      exposedHeaders: corsExposedHeaders,
      maxAge: 86_400,
      methods: corsMethods,
      optionsSuccessStatus: 204,
      strictPreflight: true,
    })

    app.addHook('onRequest', async (request, reply) => {
      const existing = singleHeader(request.headers['x-request-id'])
      const requestId = existing || request.id || randomUUID()
      request.headers['x-request-id'] = requestId
      reply.header('x-request-id', requestId)
    })

    app.addHook('onError', async (_req, _reply, error) => {
      app.log.error({ err: error })
    })

    app.addHook('onResponse', async (request, reply) => {
      if (request.method === 'OPTIONS') return
      if ((request.url === '/health' || request.url === '/ready') && reply.statusCode < 400) return
      app.log.info(`[${singleHeader(request.headers['x-request-id']) ?? request.id}] ${request.method} ${request.url} -> ${reply.statusCode} (${reply.elapsedTime.toFixed(1)}ms)`)
    })

    app.addHook('preValidation', async (request, reply) => {
      if (!enforceAuthRateLimit(request)) {
        return reply.status(429).send({
          error: 'Too many login attempts. Please wait and try again.',
          statusCode: 429,
        })
      }

      const sanitized = sanitizeRequestParts({
        body: request.body,
        params: request.params,
        query: request.query,
      })

      if (sanitized.issues.length > 0) {
        return reply.status(400).send({
          error: 'Unsafe request input.',
          statusCode: 400,
        })
      }

      const mutableRequest = request as FastifyRequest & {
        body: unknown
        params: unknown
        query: unknown
      }
      mutableRequest.body = sanitized.body
      mutableRequest.params = sanitized.params
      mutableRequest.query = sanitized.query
    })

    const cxApp = new CxApp(app, container, gracePeriodMs, host, port)

    await cxApp.bootstrapModule(moduleClass)
    cxApp.registerShutdown()

    return cxApp
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: this.host })
    console.log(`\n  ok Server running at http://localhost:${this.port}`)
  }

  // Module bootstrap

  private async bootstrapModule(moduleClass: ClassProvider): Promise<void> {
    const metadata: ModuleMetadata =
      getCompatibleMetadata(MODULE_METADATA_KEY, moduleClass) ?? {}

    for (const importedModule of metadata.imports ?? []) {
      await this.bootstrapModule(importedModule)
    }

    const allProviders = [...(metadata.providers ?? [])]

    if (metadata.middleware) allProviders.push(...metadata.middleware)
    if (metadata.guards) allProviders.push(...metadata.guards)
    if (metadata.controllers) allProviders.push(...metadata.controllers)

    for (const provider of allProviders) {
      this.container.register({ token: provider })
    }

    for (const controller of metadata.controllers ?? []) {
      this.registerController(controller)
    }
  }

  // Controller registration

  private registerController(controllerClass: ClassProvider): void {
    const prefix: string =
      getCompatibleMetadata(CONTROLLER_PREFIX_KEY, controllerClass) ?? ''
    const routes: RouteDefinition[] =
      getCompatibleMetadata(CONTROLLER_ROUTES_KEY, controllerClass) ?? []

    const instance: any = this.container.get(controllerClass)

    const controllerGuards: ClassProvider[] =
      getCompatibleMetadata(GUARDS_KEY, controllerClass) ?? []

    const controllerFilters: ClassProvider[] =
      getCompatibleMetadata(FILTERS_KEY, controllerClass) ?? []

    for (const route of routes) {
      const handlerGuards: ClassProvider[] =
        getCompatibleMetadata(GUARDS_KEY, controllerClass.prototype, route.handlerName) ?? []

      const handlerFilters: ClassProvider[] =
        getCompatibleMetadata(FILTERS_KEY, controllerClass.prototype, route.handlerName) ?? []

      const path = `/${[prefix, route.path].filter(Boolean).join('/')}`.replace(/\/+/g, '/')

      this.app.route({
        method: route.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: path,
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
          const guards = [...controllerGuards, ...handlerGuards]
          for (const Guard of guards) {
            const guardInstance: CanActivate = this.container.get(Guard)
            const allowed = await guardInstance.canActivate(request, reply)
            if (!allowed) {
              return reply.status(403).send({ error: 'Forbidden' })
            }
          }

          try {
            const args = this.resolveHandlerParams(
              controllerClass.prototype,
              route.handlerName,
              request,
              reply,
            )
            return await instance[route.handlerName](...args)
          } catch (err: unknown) {
            const allFilters = [...controllerFilters, ...handlerFilters]
            for (const Filter of allFilters) {
              const filterInstance: ExceptionFilter = this.container.get(Filter)
              await filterInstance.catch(err, request, reply)
              return
            }

            if (err instanceof HttpException) {
              return reply
                .status(err.statusCode)
                .send({ ...err.details, error: err.message, statusCode: err.statusCode })
            }

            throw err
          }
        },
      })
    }
  }

  // Parameter resolution

  private resolveHandlerParams(
    prototype: any,
    handlerName: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): any[] {
    const paramDefs: ParamDefinition[] =
      getCompatibleMetadata(PARAM_METADATA_KEY, prototype, handlerName) ?? []

    const handler: (...args: any[]) => any = prototype[handlerName]
    const paramCount = handler?.length ?? 0
    const args: any[] = new Array(paramCount).fill(undefined)

    for (const def of paramDefs) {
      switch (def.type) {
        case 'body':
          args[def.index] = def.key
            ? (request.body as Record<string, any>)?.[def.key]
            : request.body
          break
        case 'query':
          args[def.index] = def.key
            ? (request.query as Record<string, any>)?.[def.key]
            : request.query
          break
        case 'param':
          args[def.index] = def.key
            ? (request.params as Record<string, any>)?.[def.key]
            : request.params
          break
        case 'headers':
          args[def.index] = def.key
            ? request.headers?.[def.key]
            : request.headers
          break
        case 'request':
          args[def.index] = request
          break
        case 'reply':
          args[def.index] = reply
          break
      }
    }

    return args
  }

  // Shutdown

  private registerShutdown(): void {
    let isShuttingDown = false

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return
      isShuttingDown = true

      console.log(`\n  Received ${signal}, shutting down gracefully...`)

      const timeout = setTimeout(() => {
        console.error('  x Forced exit after timeout')
        process.exit(1)
      }, this.gracePeriodMs)

      try {
        await this.app.close()
        clearTimeout(timeout)
        console.log('  ok Server closed')
        process.exit(0)
      } catch (err) {
        clearTimeout(timeout)
        console.error('  x Error during shutdown:', err)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    process.on('uncaughtException', (err) => {
      this.app.log.error({ err }, 'Uncaught exception')
      shutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      this.app.log.error({ err: reason }, 'Unhandled rejection')
    })
  }
}

function validateRuntimeEnvironment() {
  if (process.env.NODE_ENV === 'production' && !settings.auth.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required in production.')
  }
}

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function enforceAuthRateLimit(request: FastifyRequest) {
  if (request.method !== 'POST' || !request.url.startsWith('/api/v1/auth/login')) return true

  const now = Date.now()
  const body = request.body as { email?: unknown; username?: unknown } | undefined
  const identity = String(body?.email ?? body?.username ?? '').trim().toLowerCase()
  const key = `${request.ip}:${identity || 'anonymous'}`
  const current = authRateLimitBuckets.get(key)

  if (!current || current.resetAt <= now) {
    authRateLimitBuckets.set(key, { count: 1, resetAt: now + authRateLimitWindowMs })
    return true
  }

  current.count += 1
  if (current.count > authRateLimitMaxAttempts) return false

  authRateLimitBuckets.set(key, current)
  return true
}

function loggerOptions(level: string) {
  if (process.env.NODE_ENV === 'production' || process.env.CXSUN_LOG_FORMAT === 'json') {
    return { level }
  }

  return {
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        singleLine: true,
        translateTime: 'SYS:HH:MM:ss',
      },
    },
  }
}

function resolveCorsOrigin(origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) {
  if (!origin) {
    callback(null, true)
    return
  }

  if (isAllowedCorsOrigin(origin)) {
    callback(null, true)
    return
  }

  callback(null, false)
}

function isAllowedCorsOrigin(origin: string) {
  const parsed = parseOrigin(origin)
  if (!parsed) return false

  if (parsed.protocol === 'https:') return true

  if (isLocalDevelopmentHost(parsed.hostname)) {
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }

  return configuredCorsOrigins().has(normalizeOrigin(origin))
}

function configuredCorsOrigins() {
  const origins = [
    settings.urls.frontend,
    settings.urls.electronDevServer,
    settings.cors.origins,
  ]
    .flatMap((value) => value?.split(',') ?? [])
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)

  return new Set(origins)
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const parsed = parseOrigin(trimmed)
  return parsed ? parsed.origin : ''
}

function parseOrigin(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isLocalDevelopmentHost(hostname: string) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.local')
}
