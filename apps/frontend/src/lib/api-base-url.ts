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

const configuredPlatformApiBaseUrl = import.meta.env.VITE_PLATFORM_API_BASE_URL

export const platformApiBaseUrl = (
  configuredPlatformApiBaseUrl
  || defaultApiBaseUrl({ port: 6105 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredBillingApiBaseUrl = import.meta.env.VITE_BILLING_API_BASE_URL

export const billingApiBaseUrl = (
  configuredBillingApiBaseUrl
  || defaultApiBaseUrl({ port: 6205 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredEcommerceApiBaseUrl = import.meta.env.VITE_ECOMMERCE_API_BASE_URL

export const ecommerceApiBaseUrl = (
  configuredEcommerceApiBaseUrl
  || defaultApiBaseUrl({ port: 6305 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredSitesApiBaseUrl = import.meta.env.VITE_SITES_API_BASE_URL

export const sitesApiBaseUrl = (
  configuredSitesApiBaseUrl
  || defaultApiBaseUrl({ port: 6405 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredCrmApiBaseUrl = import.meta.env.VITE_CRM_API_BASE_URL

export const crmApiBaseUrl = (
  configuredCrmApiBaseUrl
  || defaultApiBaseUrl({ port: 6505 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredTallyApiBaseUrl = import.meta.env.VITE_TALLY_API_BASE_URL

export const tallyApiBaseUrl = (
  configuredTallyApiBaseUrl
  || defaultApiBaseUrl({ port: 6515 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredFrappeApiBaseUrl = import.meta.env.VITE_FRAPPE_API_BASE_URL

export const frappeApiBaseUrl = (
  configuredFrappeApiBaseUrl
  || defaultApiBaseUrl({ port: 6525 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredTaskManagerApiBaseUrl = import.meta.env.VITE_TASK_MANAGER_API_BASE_URL

export const taskManagerApiBaseUrl = (
  configuredTaskManagerApiBaseUrl
  || defaultApiBaseUrl({ port: 6535 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredAuditorApiBaseUrl = import.meta.env.VITE_AUDITOR_API_BASE_URL

export const auditorApiBaseUrl = (
  configuredAuditorApiBaseUrl
  || defaultApiBaseUrl({ port: 6545 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredBlogApiBaseUrl = import.meta.env.VITE_BLOG_API_BASE_URL

export const blogApiBaseUrl = (
  configuredBlogApiBaseUrl
  || defaultApiBaseUrl({ port: 6555 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

const configuredAgentOsApiBaseUrl = import.meta.env.VITE_AGENT_OS_API_BASE_URL

export const agentOsApiBaseUrl = (
  configuredAgentOsApiBaseUrl
  || defaultApiBaseUrl({ port: 6565 })
  || configuredApiBaseUrl
)
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

function defaultApiBaseUrl(options: { port?: number } = {}) {
  if (typeof window === "undefined") {
    return ""
  }

  const { hostname, protocol } = window.location
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local")) {
    return `${protocol}//${hostname}:${options.port ?? 6005}`
  }

  return ""
}
