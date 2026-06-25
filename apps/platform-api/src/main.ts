import 'reflect-metadata'
import { CxApp } from '../../server/src/core/bootstrap.js'
import { initializeDatabase } from '../../server/src/infrastructure/database/connection.js'
import { PlatformApiModule } from './platform-api.module.js'

const port = Number(process.env.PLATFORM_API_PORT ?? process.env.CORE_API_PORT ?? 6105)

await initializeDatabase()

const app = await CxApp.create(PlatformApiModule, { port })

try {
  await app.start()

  const healthUrl = `http://localhost:${port}/health`
  const res = await fetch(healthUrl)
  const body = await res.json()
  console.log(`  ok Platform API health check: ${JSON.stringify(body)}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
