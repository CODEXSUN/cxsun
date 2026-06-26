import { envNumber, envOptionalString, envString } from './env.js'

export const settings = {
  server: {
    host: envString('HOST', '0.0.0.0'),
    port: envNumber('PLATFORM_API_PORT', envNumber('CORE_API_PORT', 6105)),
    logLevel: envString('PLATFORM_API_LOG_LEVEL', envString('LOG_LEVEL', 'info')),
    bodyLimitBytes: envNumber('BODY_LIMIT_BYTES', 30 * 1024 * 1024),
  },
  auth: {
    jwtSecret: envOptionalString('JWT_SECRET'),
  },
  urls: {
    frontend: envOptionalString('FRONTEND_URL'),
    electronDevServer: envOptionalString('ELECTRON_DEV_SERVER_URL'),
    vitePort: envNumber('VITE_PORT', 6010),
  },
  cors: {
    origins: envOptionalString('CORS_ORIGINS'),
  },
  package: {
    version: envString('npm_package_version', '0.0.0'),
  },
} as const
