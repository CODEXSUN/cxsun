import { platformApiBaseUrl } from "./api-base-url"

const configuredStorageBaseUrl = import.meta.env.VITE_STORAGE_BASE_URL ?? ""

export const storageBaseUrl = (configuredStorageBaseUrl || platformApiBaseUrl)
  .replace(/\/storage\/?$/, "")
  .replace(/\/$/, "")
