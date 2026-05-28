import { apiBaseUrl } from "./api-base-url"

const configuredStorageBaseUrl = import.meta.env.VITE_STORAGE_BASE_URL ?? ""

export const storageBaseUrl = (configuredStorageBaseUrl || apiBaseUrl)
  .replace(/\/storage\/?$/, "")
  .replace(/\/$/, "")
