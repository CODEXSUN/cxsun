import type { CxSyncDesktopApi } from "./shared/connection-contracts"

declare global {
  const __CXSYNC_CLOUD_PUBLIC_URL__: string | undefined
  const __CXSYNC_VERSION__: string

  interface Window {
    cxsyncDesktop?: CxSyncDesktopApi
  }
}

export {}
