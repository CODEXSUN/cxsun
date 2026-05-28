const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ""

export const apiBaseUrl = (configuredApiBaseUrl || defaultApiBaseUrl())
  .replace(/\/api(\/v\d+)?\/?$/, "")
  .replace(/\/$/, "")

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
