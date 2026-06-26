import 'reflect-metadata'

export const MIDDLEWARE_KEY = Symbol('module:middleware')

export interface MiddlewareConsumer {
  forRoutes(...routes: (string | (abstract new (...args: any[]) => any))[]): void
}

export interface MiddlewareConfig {
  middleware: (abstract new (...args: any[]) => any)
  routes: (string | (abstract new (...args: any[]) => any))[]
}
