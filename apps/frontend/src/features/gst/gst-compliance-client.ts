import { authHeaders, billingApiBaseUrl, type AuthSession } from "src/features/auth/auth-client"

export const gstComplianceOperations = [
  "authenticate",
  "gstnDetails",
  "syncGstinFromCommonPortal",
  "generateIrn",
  "getEinvoiceByIrn",
  "getIrnByDocument",
  "cancelIrn",
  "getRejectedIrns",
  "generateEwaybillByIrn",
  "getEwaybillByIrn",
  "cancelEwaybill",
  "getB2cQrCode",
] as const

export type GstComplianceOperation = typeof gstComplianceOperations[number]
export type GstProviderEnvironment = "production" | "sandbox"
export type GstProviderPurpose = "einvoice_eway" | "eway_only"

export interface GstComplianceDocument {
  ackDate: string | null
  ackNo: string | null
  documentDate?: string | null
  documentNo?: string | null
  ewayBillDate: string | null
  ewayBillNo: string | null
  ewayStatus: string
  ewayCancelledAt?: string | null
  ewayGeneratedAt?: string | null
  ewayValidUpto?: string | null
  irn: string | null
  irnStatus: string
  irnCancelledAt?: string | null
  irnGeneratedAt?: string | null
  signedQr: string | null
  sourceId?: number | null
  sourceType?: string | null
  sourceUuid?: string | null
  uuid?: string
}

export interface GstComplianceOperationInput {
  companyId?: string | number | null
  documentDate?: string | null
  documentNo?: string | null
  environment?: GstProviderEnvironment | null
  purpose?: GstProviderPurpose | null
  payload?: unknown
  query?: Record<string, unknown>
  sourceId?: string | number | null
  sourceType?: string | null
  sourceUuid?: string | null
}

interface GstComplianceRequestOptions {
  companyId?: string | number | null
  environment?: GstProviderEnvironment
  purpose?: GstProviderPurpose
  sourceType?: string
  tenantCode?: string
}

function gstHeaders(session: AuthSession, options?: GstComplianceRequestOptions) {
  return {
    ...authHeaders(session),
    ...(options?.tenantCode ? { "x-tenant-code": options.tenantCode } : {}),
  }
}

function gstQuery(options?: Pick<GstComplianceRequestOptions, "companyId" | "environment" | "purpose" | "sourceType">) {
  const params = new URLSearchParams()
  if (options?.environment) params.set("environment", options.environment)
  if (options?.purpose) params.set("purpose", options.purpose)
  if (options?.companyId !== undefined && options.companyId !== null) params.set("companyId", String(options.companyId))
  if (options?.sourceType) params.set("sourceType", options.sourceType)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export interface GstComplianceSettings {
  baseUrl: string
  clientId: string
  companyId: string
  email: string
  environment: "production" | "sandbox"
  purpose: GstProviderPurpose
  gstin: string
  clientSecret?: string
  hasClientSecret: boolean
  hasPassword: boolean
  ipAddress: string
  isEnabled: boolean
  password?: string
  provider: "whitebooks"
  username: string
  uuid: string
}

export interface GstProviderGlobalSettings {
  baseUrl: string
  clientId: string
  clientSecret: string
  email: string
  environment: "production" | "sandbox"
  purpose: GstProviderPurpose
  ipAddress: string
  isEnabled: boolean
  provider: "whitebooks"
  uuid: string
}

export interface GstProviderGlobalSettingsInput {
  baseUrl?: string
  clientId?: string
  clientSecret?: string
  email?: string
  environment?: "production" | "sandbox"
  purpose?: GstProviderPurpose
  ipAddress?: string
  isEnabled?: boolean
  provider?: "whitebooks"
}

export interface GstComplianceSettingsInput {
  baseUrl?: string
  clientId?: string
  clientSecret?: string
  email?: string
  environment?: "production" | "sandbox"
  gstin?: string
  ipAddress?: string
  isEnabled?: boolean
  password?: string
  provider?: "whitebooks"
  username?: string
}

export interface GstComplianceOperationRecord {
  createdAt: string
  endpoint: string
  errorMessage: string | null
  httpStatus: number | null
  gatewayStatus?: string | null
  id: string
  method: string
  operation: GstComplianceOperation
  providerStatus: string | null
  errorCode?: string | null
  retryState?: string | null
  requestJson: Record<string, unknown>
  responseJson: unknown
  success: boolean
  uuid: string
}

export interface GstComplianceTokenStatus {
  environment: "production" | "sandbox" | null
  expiresInSeconds: number | null
  gstin: string | null
  hasToken: boolean
  isExpired: boolean
  provider: "whitebooks" | null
  purpose: GstProviderPurpose | null
  tokenExpiry: string | null
  tokenPreview: string | null
  updatedAt: string | null
}

export async function runGstComplianceOperation(session: AuthSession, operation: GstComplianceOperation, input: GstComplianceOperationInput, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/operations/${encodeURIComponent(operation)}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...gstHeaders(session, options), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await gstComplianceResponseError(response, `GST compliance request failed with status ${response.status}.`))
  const result = (await response.json()) as {
    document?: GstComplianceDocument | null
    error?: string | null
    ok: boolean
    response?: unknown
  }
  if (!result.ok) throw new Error(result.error ?? "GST compliance provider rejected the request.")
  return result
}

async function gstComplianceResponseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown; title?: unknown; errors?: unknown }
    const details = Array.isArray(body.errors) ? body.errors.map((entry) => String(entry)).filter(Boolean).join(" ") : ""
    return String((body.error ?? body.message ?? body.title ?? details) || fallback)
  } catch {
    return fallback
  }
}

export async function getGstComplianceTokenStatus(session: AuthSession, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/token${gstQuery(options)}`, {
    cache: "no-store",
    headers: gstHeaders(session, options),
  })
  if (!response.ok) throw new Error(`GST compliance token status failed with status ${response.status}.`)
  return (await response.json()) as GstComplianceTokenStatus
}

export async function getGstComplianceSettings(session: AuthSession, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/settings${gstQuery(options)}`, {
    cache: "no-store",
    headers: gstHeaders(session, options),
  })
  if (!response.ok) throw new Error(`GST compliance settings failed with status ${response.status}.`)
  return (await response.json()) as GstComplianceSettings
}

export async function getGstProviderGlobalSettings(session: AuthSession, environment: "production" | "sandbox" = "production", purpose: GstProviderPurpose = "einvoice_eway") {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/global-settings${gstQuery({ environment, purpose })}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`GST provider global settings failed with status ${response.status}.`)
  return (await response.json()) as GstProviderGlobalSettings
}

export async function saveGstProviderGlobalSettings(session: AuthSession, input: GstProviderGlobalSettingsInput) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/global-settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "PATCH",
  })
  if (!response.ok) throw new Error(`GST provider global settings save failed with status ${response.status}.`)
  return (await response.json()) as GstProviderGlobalSettings
}

export async function saveGstComplianceSettings(session: AuthSession, input: GstComplianceSettingsInput, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...gstHeaders(session, options), "Content-Type": "application/json" },
    method: "PATCH",
  })
  if (!response.ok) throw new Error(`GST compliance settings save failed with status ${response.status}.`)
  return (await response.json()) as GstComplianceSettings
}

export async function listGstComplianceOperations(session: AuthSession, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/operations${gstQuery(options)}`, {
    cache: "no-store",
    headers: gstHeaders(session, options),
  })
  if (!response.ok) throw new Error(`GST compliance history failed with status ${response.status}.`)
  return (await response.json()) as GstComplianceOperationRecord[]
}

export async function listGstComplianceDocuments(session: AuthSession, options?: GstComplianceRequestOptions) {
  const response = await fetch(`${billingApiBaseUrl}/api/v1/gst-compliance/documents${gstQuery(options)}`, {
    cache: "no-store",
    headers: gstHeaders(session, options),
  })
  if (!response.ok) throw new Error(`GST compliance documents failed with status ${response.status}.`)
  return (await response.json()) as GstComplianceDocument[]
}
