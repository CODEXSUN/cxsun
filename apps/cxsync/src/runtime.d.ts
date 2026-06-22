import type { CxSyncDesktopApi } from "./shared/connection-contracts"

declare global {
  const __CXSYNC_CLOUD_PUBLIC_URL__: string | undefined

  interface Window {
    cxsyncDesktop?: CxSyncDesktopApi
  }
}

export {}
