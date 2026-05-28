import fallbackLogoDarkUrl from "src/assets/logo/logo-dark.svg"
import fallbackLogoUrl from "src/assets/logo/logo.svg"
import fallbackFaviconUrl from "src/assets/logo/favicon.svg"
import type { CompanyLogo, CompanyRecord } from "./company-client"

export type CompanyLogoType = "logo" | "logo-dark" | "favicon" | "letter-head"

export function companyLogoUrl(company: Pick<CompanyRecord, "logos"> | { logos?: CompanyLogo[] } | null | undefined, logoType: CompanyLogoType = "logo") {
  const logos = company?.logos ?? []
  const normalizedType = normalizeLogoType(logoType)
  const logo = logos.find((item) => item.isActive && normalizeLogoType(item.logoType) === normalizedType)
    ?? logos.find((item) => item.isActive && normalizeLogoType(item.logoType) === "logo")

  return normalizeLogoUrl(logo?.logoUrl) || fallbackLogo(logoType)
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

function normalizeLogoUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/api/")) return trimmed
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function fallbackLogo(logoType: CompanyLogoType) {
  if (logoType === "logo-dark") return fallbackLogoDarkUrl
  if (logoType === "favicon") return fallbackFaviconUrl
  return fallbackLogoUrl
}
