interface DesktopRuntime {
  apiBaseUrl?: string
  appHost?: string
  hostsEntry?: string
}

declare global {
  interface Window {
    cxsunDesktop?: DesktopRuntime
  }
}

const desktopApiBaseUrl = typeof window !== "undefined" ? window.cxsunDesktop?.apiBaseUrl : undefined

const configuredApiBaseUrl = desktopApiBaseUrl
  ?? import.meta.env.VITE_API_BASE_URL
  ?? ""

export const apiBaseUrl = (configuredApiBaseUrl || defaultApiBaseUrl())
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

export const platformApiBaseUrl = apiBaseUrl
export const billingApiBaseUrl = apiBaseUrl
export const ecommerceApiBaseUrl = apiBaseUrl
export const sitesApiBaseUrl = apiBaseUrl
export const crmApiBaseUrl = apiBaseUrl
export const tallyApiBaseUrl = apiBaseUrl
export const frappeApiBaseUrl = apiBaseUrl
export const taskManagerApiBaseUrl = apiBaseUrl
export const auditorApiBaseUrl = apiBaseUrl
export const blogApiBaseUrl = apiBaseUrl
export const agentOsApiBaseUrl = apiBaseUrl

function defaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return ""
  }

  const { hostname, protocol } = window.location
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local")) {
    return `${protocol}//${hostname}:6005`
  }

  return ""
}
