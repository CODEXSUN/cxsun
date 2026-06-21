import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import { app } from "electron"
import type { TenantConnectionVerification } from "../../src/shared/connection-contracts.js"
import { getPrivateTenantConnection, saveTenantHandshake } from "./tenant-connection-store.js"

export async function verifyTenantConnection(id: string): Promise<TenantConnectionVerification> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")

  const [local, cloud] = await Promise.all([
    verifyLocal(tenant),
    verifyCloud(tenant),
  ])

  const verification: TenantConnectionVerification = {
    cloud,
    local,
    versionsMatch: local.ok && cloud.ok && normalizeVersion(local.version) === normalizeVersion(cloud.version),
    verifiedAt: new Date().toISOString(),
  }
  await saveTenantHandshake(id, verification)
  return verification
}

type PrivateTenantConnection = NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>

async function verifyLocal(tenant: PrivateTenantConnection) {
  const startedAt = Date.now()
  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      connectTimeout: 8_000,
      database: tenant.localDatabase,
      host: tenant.localHost,
      password: tenant.localPassword,
      port: tenant.localPort,
      user: tenant.localUser,
    })
    const [rows] = await connection.query<Array<RowDataPacket & { version: string }>>("SELECT VERSION() AS version")
    return {
      database: tenant.localDatabase,
      latencyMs: Date.now() - startedAt,
      message: `Local tenant database connected · MariaDB ${rows[0]?.version ?? "unknown"}.`,
      ok: true,
      version: app.getVersion(),
    }
  } catch (error) {
    return {
      database: tenant.localDatabase,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Local tenant database failed.",
      ok: false,
      version: "unavailable",
    }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

async function verifyCloud(tenant: PrivateTenantConnection) {
  const startedAt = Date.now()
  try {
    const baseUrl = tenant.cloudApiUrl.replace(/\/+$/, "")
    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      body: JSON.stringify({
        corporateId: tenant.corporateId,
        email: tenant.cloudAdminEmail,
        password: tenant.cloudAdminPassword,
        surface: "tenant",
      }),
      headers: {
        "Content-Type": "application/json",
        ...(tenant.cloudDomain ? { "x-login-domain": tenant.cloudDomain } : {}),
      },
      method: "POST",
    })
    const login = await loginResponse.json() as { error?: string; ok?: boolean }
    if (!loginResponse.ok || !login.ok) throw new Error(login.error || `Cloud login returned HTTP ${loginResponse.status}.`)

    const healthResponse = await fetch(`${baseUrl}/health`, { cache: "no-store" })
    if (!healthResponse.ok) throw new Error(`Cloud health returned HTTP ${healthResponse.status}.`)
    const health = await healthResponse.json() as { version?: string }
    return {
      latencyMs: Date.now() - startedAt,
      message: "Cloud handshake and admin login verified.",
      ok: true,
      version: health.version ?? "unknown",
    }
  } catch (error) {
    return {
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Cloud handshake failed.",
      ok: false,
      version: "unavailable",
    }
  }
}

function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "").split("+")[0]
}
