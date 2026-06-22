import { loadCxSyncEnvironment } from "./environment.js"

export async function cxSyncCloudHeaders(extra: Record<string, string> = {}) {
  const env = await loadCxSyncEnvironment()
  const serviceKey = env.CXSYNC_SERVICE_KEY?.trim()
  return {
    ...extra,
    ...(serviceKey ? { "x-cxsync-service-key": serviceKey } : {}),
  }
}
