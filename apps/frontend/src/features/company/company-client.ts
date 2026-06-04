import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"

export type CompanyStatus = "active" | "not_active" | "suspend"

export interface CompanyLogo {
  id?: number
  logoUrl: string
  logoType: string
  isActive: boolean
}

export interface CompanyAddress {
  id?: number
  addressTypeId: string | null
  addressLine1: string
  addressLine2: string | null
  cityId: string | null
  cityName?: string | null
  districtId: string | null
  districtName?: string | null
  stateId: string | null
  stateName?: string | null
  countryId: string | null
  countryName?: string | null
  pincodeId: string | null
  pincodeName?: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  isActive: boolean
}

export interface CompanyEmail {
  id?: number
  email: string
  emailType: string
  isPrimary?: boolean
  isActive: boolean
}

export interface CompanyPhone {
  id?: number
  phoneNumber: string
  phoneType: string
  isPrimary: boolean
  isActive: boolean
}

export interface CompanySocialLink {
  id?: number
  platform: string
  url: string
  isActive: boolean
}

export interface CompanyBankAccount {
  id?: number
  bankName: string
  accountNumber: string
  accountHolderName: string
  ifsc: string
  branch: string | null
  qrImageUrl: string | null
  isPrimary: boolean
  isActive: boolean
}

export interface CompanyRecord {
  id: number
  tenantId: number | null
  tenantName: string
  industryId: number | null
  industryCode: string | null
  industryName: string
  code: string
  name: string
  legalName: string | null
  tagline: string | null
  shortAbout: string | null
  gstinUin: string | null
  pan: string | null
  dateOfIncorporation: string | null
  msmeNo: string | null
  msmeCategory: string | null
  tan: string | null
  tdsAvailable: boolean
  tdsSection: string | null
  tdsRatePercent: number | null
  tcsAvailable: boolean
  tcsSection: string | null
  tcsRatePercent: number | null
  website: string | null
  description: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  isPrimary: boolean
  isActive: boolean
  status: CompanyStatus
  settings: Record<string, unknown>
  features: string[]
  logos: CompanyLogo[]
  addresses: CompanyAddress[]
  emails: CompanyEmail[]
  phones: CompanyPhone[]
  socialLinks: CompanySocialLink[]
  bankAccounts: CompanyBankAccount[]
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

export interface DefaultCompanyContext {
  id: number | null
  companyId: number
  companyName: string
  companyCode: string
  logos: CompanyLogo[]
  accountingYearId: number
  accountingYearName: string
  accountingYearStartDate: string | null
  accountingYearEndDate: string | null
  landingApp: string
}

export type CompanyUpsertInput = Omit<
  CompanyRecord,
  "id" | "tenantId" | "tenantName" | "industryId" | "industryCode" | "industryName" | "createdAt" | "updatedAt" | "deletedAt"
> & { id?: number; industryId?: number | null }

export async function listCompanies(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Company list failed with status ${response.status}.`)
  }

  return enrichCompanyAddressLabels(session, (await response.json()) as CompanyRecord[])
}

export async function getDefaultCompanyContext(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/default-context`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Default company context failed with status ${response.status}.`)
  }

  return (await response.json()) as DefaultCompanyContext | null
}

export async function updateDefaultCompanyContext(session: AuthSession, input: { companyId: number; accountingYearId: number; landingApp?: string }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/default-context`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Default company save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; context?: DefaultCompanyContext; error?: string }

  if (!result.ok || !result.context) {
    throw new Error(result.error ?? "Default company save failed.")
  }

  return result.context
}

export async function getCompany(session: AuthSession, id: number) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/${id}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Company get failed with status ${response.status}.`)
  }

  return (await enrichCompanyAddressLabels(session, [(await response.json()) as CompanyRecord]))[0]
}

export async function upsertCompany(session: AuthSession, input: CompanyUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; company?: CompanyRecord; error?: string }

  if (!result.ok || !result.company) {
    throw new Error(result.error ?? "Company save failed.")
  }

  return (await enrichCompanyAddressLabels(session, [result.company]))[0]
}

export async function destroyCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "destroy")
}

export async function restoreCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "restore")
}

async function mutateCompany(session: AuthSession, id: number, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/${id}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company ${action} failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? `Company ${action} failed.`)
  }
}

export function emptyCompany(): CompanyUpsertInput {
  return {
    code: "",
    name: "",
    industryId: null,
    legalName: null,
    tagline: null,
    shortAbout: null,
    gstinUin: null,
    pan: null,
    dateOfIncorporation: null,
    msmeNo: null,
    msmeCategory: null,
    tan: null,
    tdsAvailable: false,
    tdsSection: null,
    tdsRatePercent: null,
    tcsAvailable: false,
    tcsSection: null,
    tcsRatePercent: null,
    website: null,
    description: null,
    primaryEmail: null,
    primaryPhone: null,
    isPrimary: false,
    isActive: true,
    status: "active",
    settings: { timezone: "Asia/Calcutta", currency: "INR" },
    features: ["company.manage"],
    logos: [],
    addresses: [],
    emails: [],
    phones: [],
    socialLinks: [],
    bankAccounts: [],
  }
}

export function toCompanyInput(company: CompanyRecord): CompanyUpsertInput {
  return {
    id: company.id,
    industryId: company.industryId,
    code: company.code,
    name: company.name,
    legalName: company.legalName,
    tagline: company.tagline,
    shortAbout: company.shortAbout,
    gstinUin: company.gstinUin,
    pan: company.pan,
    dateOfIncorporation: company.dateOfIncorporation,
    msmeNo: company.msmeNo,
    msmeCategory: company.msmeCategory,
    tan: company.tan,
    tdsAvailable: company.tdsAvailable,
    tdsSection: company.tdsSection,
    tdsRatePercent: company.tdsRatePercent,
    tcsAvailable: company.tcsAvailable,
    tcsSection: company.tcsSection,
    tcsRatePercent: company.tcsRatePercent,
    website: company.website,
    description: company.description,
    primaryEmail: company.primaryEmail,
    primaryPhone: company.primaryPhone,
    isPrimary: company.isPrimary,
    isActive: company.isActive,
    status: company.status,
    settings: company.settings,
    features: company.features,
    logos: company.logos,
    addresses: company.addresses.map(({ cityName, countryName, districtName, pincodeName, stateName, ...address }) => address),
    emails: company.emails,
    phones: company.phones,
    socialLinks: company.socialLinks,
    bankAccounts: company.bankAccounts,
  }
}

async function enrichCompanyAddressLabels(session: AuthSession, companies: CompanyRecord[]) {
  if (!companies.some((company) => company.addresses.length > 0)) return companies

  try {
    const labels = await loadAddressLabels(session)
    return companies.map((company) => ({
      ...company,
      addresses: company.addresses.map((address) => ({
        ...address,
        cityName: labelFrom(labels.cities, address.cityId),
        countryName: labelFrom(labels.countries, address.countryId),
        districtName: labelFrom(labels.districts, address.districtId),
        pincodeName: labelFrom(labels.pincodes, address.pincodeId),
        stateName: labelFrom(labels.states, address.stateId),
      })),
    }))
  } catch {
    return companies
  }
}

async function loadAddressLabels(session: AuthSession) {
  const [cities, countries, districts, pincodes, states] = await Promise.all([
    listMasterDataRecords(session, "cities"),
    listMasterDataRecords(session, "countries"),
    listMasterDataRecords(session, "districts"),
    listMasterDataRecords(session, "pincodes"),
    listMasterDataRecords(session, "states"),
  ])

  return {
    cities: buildLabelMap(cities),
    countries: buildLabelMap(countries),
    districts: buildLabelMap(districts),
    pincodes: buildLabelMap(pincodes),
    states: buildLabelMap(states),
  }
}

function buildLabelMap(records: MasterDataRecord[]) {
  const map = new Map<string, string>()
  for (const record of records) {
    const label = commonRecordLabel(record)
    for (const key of [record.id, record.uuid, record.name, record.code]) {
      if (key !== null && key !== undefined && key !== "") map.set(String(key), label)
    }
  }
  return map
}

function labelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return null
  return map.get(String(value)) ?? null
}

function commonRecordLabel(record: MasterDataRecord) {
  if (record.rate_percent !== null && record.rate_percent !== undefined) return `${record.rate_percent}%`
  return String(record.name ?? record.code ?? record.description ?? record.id)
}
