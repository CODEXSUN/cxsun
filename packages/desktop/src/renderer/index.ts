export interface CxSunDesktopRuntime {
  apiBaseUrl: string
  appHost: string
  hostsEntry: string
  platform: NodeJS.Platform
  versions: {
    chrome: string
    electron: string
    node: string
  }
}

declare global {
  interface Window {
    cxsunDesktop?: CxSunDesktopRuntime
  }
}

export {}
