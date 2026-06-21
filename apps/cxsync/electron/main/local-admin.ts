import { timingSafeEqual } from "node:crypto"
import type { RowDataPacket } from "mysql2"
import { app } from "electron"
import type { LocalAdminSession, LocalEnvironmentStatus } from "../../src/shared/connection-contracts.js"
import { loadCxSyncEnvironment } from "./environment.js"
import { getCxSyncDatabase, getCxSyncDatabaseInfo } from "./cxsync-database.js"

export async function authenticateLocalAdmin(email: string, password: string): Promise<LocalAdminSession> {
  const env = await loadCxSyncEnvironment()
  const expectedEmail = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const expectedPassword = env.SUPER_ADMIN_PASSWORD ?? ""

  if (!expectedEmail || !expectedPassword) throw new Error("Local super-admin credentials are not configured in .env.")
  if (!safeEqual(email.trim().toLowerCase(), expectedEmail) || !safeEqual(password, expectedPassword)) {
    throw new Error("Invalid local login details.")
  }

  return {
    email: expectedEmail,
    name: env.SUPER_ADMIN_NAME?.trim() || "Super Admin",
    role: "super-admin",
  }
}

export async function getLocalEnvironmentStatus(): Promise<LocalEnvironmentStatus> {
  const info = await getCxSyncDatabaseInfo()
  const database = await getCxSyncDatabase()
  const [rows] = await database.query<Array<RowDataPacket & { serverVersion: string }>>("SELECT VERSION() AS serverVersion")
  return {
    appVersion: app.getVersion(),
    database: info.database,
    databaseServerVersion: rows[0]?.serverVersion ?? "unknown",
    host: info.host,
    ok: true,
    port: info.port,
    user: info.user,
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
