import type { FastifyInstance } from 'fastify'

export interface ShutdownManager {
  register(signal: string): void
  shutdown(signal: string): Promise<void>
}

export function createShutdownManager(
  app: FastifyInstance,
  gracePeriodMs: number,
): ShutdownManager {
  let isShuttingDown = false

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`\n  ╰ Received ${signal}, shutting down gracefully...`)

    const timeout = setTimeout(() => {
      console.error('  ✗ Forced exit after timeout')
      process.exit(1)
    }, gracePeriodMs)

    try {
      await app.close()
      clearTimeout(timeout)
      console.log('  ✓ Server closed')
      process.exit(0)
    } catch (err) {
      clearTimeout(timeout)
      console.error('  ✗ Error during shutdown:', err)
      process.exit(1)
    }
  }

  return {
    register(signal: string) {
      process.on(signal, () => shutdown(signal))
    },

    shutdown,
  }
}
