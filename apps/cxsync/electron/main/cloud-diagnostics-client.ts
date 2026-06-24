import type { CloudDiagnosticCheck, CloudDiagnostics } from "../../src/shared/connection-contracts.js"
import { cxSyncCloudHeaders } from "./cxsync-cloud-client.js"
import { getServiceKeyStatus } from "./environment.js"

export async function runCloudDiagnostics(): Promise<CloudDiagnostics> {
  const status = await getServiceKeyStatus()
  const baseUrl = status.cloudServiceUrl?.replace(/\/+$/, "")
  if (!baseUrl) throw new Error("Configure the CXSync Cloud service URL before running diagnostics.")
  const headers = await cxSyncCloudHeaders({ Accept: "application/json" })
  const transport: CloudDiagnosticCheck[] = []
  transport.push(await endpointCheck("cloud-health", "Cloud health endpoint", `${baseUrl}/health`, {}))
  transport.push(await endpointCheck("cloud-status", "Protected CXSync API", `${baseUrl}/api/v1/cxsync-cloud/status`, { headers }))
  const response = await fetch(`${baseUrl}/api/v1/cxsync-cloud/diagnostics`, { headers, signal: AbortSignal.timeout(20_000) })
  const body = await response.json().catch(() => null) as { diagnostics?: CloudDiagnostics; error?: string } | null
  if (!response.ok || !body?.diagnostics) throw new Error(body?.error || `Cloud diagnostics returned HTTP ${response.status}.`)
  const checks = [...transport, ...body.diagnostics.checks]
  return { ...body.diagnostics, checks, overall: checks.some((item) => item.status === "fail") ? "unhealthy" : checks.some((item) => item.status === "warning") ? "warning" : "healthy" }
}

async function endpointCheck(id: string, label: string, url: string, init: RequestInit): Promise<CloudDiagnosticCheck> {
  const started = Date.now()
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
    return { detail: `HTTP ${response.status} in ${Date.now() - started} ms.`, id, label, recommendation: response.ok ? null : "Check the reverse proxy, service key, container logs, and published API port.", status: response.ok ? "pass" : "fail" }
  } catch (reason) {
    return { detail: reason instanceof Error ? reason.message : "Endpoint was unreachable.", id, label, recommendation: "Check DNS, TLS, Nginx, the CXSync maintenance container, and host ports 6078/6080.", status: "fail" }
  }
}
