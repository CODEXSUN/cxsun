import Fastify from 'fastify'
import cors from '@fastify/cors'

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString(), version: process.env.npm_package_version || '0.0.0' }
})

try {
  await app.listen({ port: PORT, host: HOST })
  console.log(`\n  ✓ Server running at http://localhost:${PORT}`)
  console.log(`  ✓ Health check at http://localhost:${PORT}/health\n`)

  // Smoke test — verify health endpoint on startup
  try {
    const res = await fetch(`http://localhost:${PORT}/health`)
    const body = await res.json()
    console.log(`  ✓ Smoke test: /health → ${JSON.stringify(body)}`)
  } catch {
    console.log(`  ⚠ Smoke test: /health unreachable`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
