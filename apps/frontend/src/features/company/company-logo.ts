import fallbackLogoDarkUrl from "src/assets/logo/logo-dark.svg"
import fallbackLogoUrl from "src/assets/logo/logo.svg"
import fallbackFaviconUrl from "src/assets/logo/favicon.svg"
import { storageBaseUrl } from "src/lib/storage-base-url"
import type { CompanyLogo, CompanyRecord } from "./company-client"

export type CompanyLogoType = "logo" | "logo-dark" | "favicon" | "letter-head"

export function companyLogoUrl(company: Pick<CompanyRecord, "logos"> | { logos?: CompanyLogo[] } | null | undefined, logoType: CompanyLogoType = "logo") {
  const logos = company?.logos ?? []
  const normalizedType = normalizeLogoType(logoType)
  const logo = logos.find((item) => item.isActive && normalizeLogoType(item.logoType) === normalizedType)
    ?? logos.find((item) => item.isActive && normalizeLogoType(item.logoType) === "logo")

  return normalizeLogoUrl(logo) || fallbackLogo(logoType)
}

export function companyLogoSet(company: Pick<CompanyRecord, "logos"> | { logos?: CompanyLogo[] } | null | undefined) {
  return {
    faviconUrl: companyLogoUrl(company, "favicon"),
    logoDarkUrl: companyLogoUrl(company, "logo-dark"),
    logoUrl: companyLogoUrl(company, "logo"),
  }
}

function normalizeLogoType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function normalizeLogoUrl(logo: CompanyLogo | null | undefined) {
  const trimmed = logo?.logoUrl?.trim() ?? ""
  if (!trimmed) return ""
  const resolved = resolveStorageUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`)
  if (!logo?.id || !isTenantStorageUrl(resolved)) return resolved
  const separator = resolved.includes("?") ? "&" : "?"
  return `${resolved}${separator}v=${encodeURIComponent(String(logo.id))}`
}

function resolveStorageUrl(value: string) {
  if (/^https?:\/\//i.test(value) || value.startsWith("/api/")) return value
  if (value.startsWith("/storage/") && storageBaseUrl) return `${storageBaseUrl}${value}`
  return value
}

function isTenantStorageUrl(value: string) {
  return /^https?:\/\/[^/]+\/storage\//i.test(value) || value.startsWith("/storage/")
}

function fallbackLogo(logoType: CompanyLogoType) {
  if (logoType === "logo-dark") return fallbackLogoDarkUrl
  if (logoType === "favicon") return fallbackFaviconUrl
  return fallbackLogoUrl
}
