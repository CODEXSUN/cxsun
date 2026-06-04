import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import type { GstComplianceOperation, GstProviderSettingsSecretRecord } from '../domain/gst-compliance.types.js'

export interface MasterGstRequest {
  endpoint: string
  method: 'GET' | 'POST'
  payload?: unknown
  query?: Record<string, unknown>
  token?: string
}

export interface MasterGstResponse {
  endpoint: string
  httpStatus: number
  method: 'GET' | 'POST'
  ok: boolean
  response: unknown
}

interface MasterGstOperationDefinition {
  endpoint: string
  method: 'GET' | 'POST'
  needsAuth: boolean
}

const masterGstOperations: Record<GstComplianceOperation, MasterGstOperationDefinition> = {
  authenticate: { endpoint: '/einvoice/authenticate', method: 'GET', needsAuth: false },
  gstnDetails: { endpoint: '/einvoice/type/GSTNDETAILS/version/V1_03', method: 'GET', needsAuth: true },
  syncGstinFromCommonPortal: { endpoint: '/einvoice/type/SYNC_GSTIN_FROMCP/version/V1_03', method: 'GET', needsAuth: true },
  generateIrn: { endpoint: '/einvoice/type/GENERATE/version/V1_03', method: 'POST', needsAuth: true },
  getEinvoiceByIrn: { endpoint: '/einvoice/type/GETIRN/version/V1_03', method: 'GET', needsAuth: true },
  getIrnByDocument: { endpoint: '/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03', method: 'GET', needsAuth: true },
  cancelIrn: { endpoint: '/einvoice/type/CANCEL/version/V1_03', method: 'POST', needsAuth: true },
  getRejectedIrns: { endpoint: '/einvoice/type/GETREJECTEDIRNS/version/V1_03', method: 'GET', needsAuth: true },
  generateEwaybillByIrn: { endpoint: '/einvoice/type/GENERATE_EWAYBILL/version/V1_03', method: 'POST', needsAuth: true },
  getEwaybillByIrn: { endpoint: '/einvoice/type/GETEWAYBILLIRN/version/V1_03', method: 'GET', needsAuth: true },
  getB2cQrCode: { endpoint: '/einvoice/qrcode', method: 'GET', needsAuth: true },
}

export function masterGstOperationDefinition(operation: GstComplianceOperation) {
  return masterGstOperations[operation]
}

export async function callMasterGst(settings: GstProviderSettingsSecretRecord, request: MasterGstRequest): Promise<MasterGstResponse> {
  validateSettings(settings, request.token)
  const url = buildUrl(settings.baseUrl, request.endpoint, { ...(request.query ?? {}), email: settings.email })
  const response = await fetch(url, {
    body: request.method === 'POST' ? JSON.stringify(request.payload ?? {}) : undefined,
    headers: masterGstHeaders(settings, request.token),
    method: request.method,
  })
  const text = await response.text()
  return {
    endpoint: request.endpoint,
    httpStatus: response.status,
    method: request.method,
    ok: response.ok,
    response: parseResponse(text),
  }
}

export function masterGstHeaders(settings: GstProviderSettingsSecretRecord, token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    email: settings.email,
    username: settings.username,
    password: settings.password,
    ip_address: settings.ipAddress || '0.0.0.0',
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    gstin: settings.gstin,
    ...(token ? { 'auth-token': token } : {}),
  }
}

export function redactedMasterGstHeaders(settings: GstProviderSettingsSecretRecord, token?: string): Record<string, string> {
  return {
    email: settings.email,
    username: settings.username,
    password: settings.password ? '***' : '',
    ip_address: settings.ipAddress || '0.0.0.0',
    client_id: settings.clientId,
    client_secret: settings.clientSecret ? '***' : '',
    gstin: settings.gstin,
    ...(token ? { 'auth-token': '***' } : {}),
  }
}

function validateSettings(settings: GstProviderSettingsSecretRecord, token?: string) {
  const missing = [
    !settings.email ? 'email' : '',
    !settings.username ? 'username' : '',
    !settings.password ? 'password' : '',
    !settings.clientId ? 'client id' : '',
    !settings.clientSecret ? 'client secret' : '',
    !settings.gstin ? 'GSTIN' : '',
    token === '' ? 'auth token' : '',
  ].filter(Boolean)
  if (missing.length) throw new BadRequestException(`MasterGST setting is missing ${missing.join(', ')}.`)
}

function buildUrl(baseUrl: string, endpoint: string, query: Record<string, unknown>) {
  const url = new URL(endpoint, normalizeBaseUrl(baseUrl))
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim() || 'https://api.mastergst.com'
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function parseResponse(value: string) {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}
