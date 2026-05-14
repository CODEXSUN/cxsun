import 'reflect-metadata'
import { CxApp } from './core/bootstrap.js'
import { initializeDatabase } from './infrastructure/database/connection.js'
import { AppModule } from './modules/index.js'

await initializeDatabase()

const app = await CxApp.create(AppModule)

try {
  await app.start()

  const healthUrl = `http://localhost:${(app as any).port || 6001}/health`
  const res = await fetch(healthUrl)
  const body = await res.json()
  console.log(`  ✓ Health check: ${JSON.stringify(body)}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
