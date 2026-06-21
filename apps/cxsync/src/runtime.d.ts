import type { CxSyncDesktopApi } from "./shared/connection-contracts"

declare global {
  interface Window {
    cxsyncDesktop?: CxSyncDesktopApi
  }
}

export {}
