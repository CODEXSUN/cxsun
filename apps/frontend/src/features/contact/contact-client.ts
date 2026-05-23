import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface ContactAddress {
  id?: string
  contactId?: string
  addressTypeId: string | null
  addressLine1: string
  addressLine2: string | null
  cityId: string | null
  districtId: string | null
  stateId: string | null
  countryId: string | null
  pincodeId: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  isActive?: boolean
}

export const contactEmailTypes = ["primary", "work", "billing", "personal", "support", "other"] as const
export const contactPhoneTypes = ["mobile", "work", "billing", "whatsapp", "landline", "other"] as const
export type ContactEmailType = (typeof contactEmailTypes)[number]
export type ContactPhoneType = (typeof contactPhoneTypes)[number]

export interface ContactEmail { id?: string; contactId?: string; email: string; emailType: ContactEmailType; isPrimary: boolean; isActive?: boolean }
export interface ContactPhone { id?: string; contactId?: string; phoneNumber: string; phoneType: ContactPhoneType; isPrimary: boolean; isActive?: boolean }
export interface ContactSocialLink { id?: string; contactId?: string; platform: string; url: string; isActive: boolean }
export interface ContactBankAccount { id?: string; contactId?: string; bankName: string; accountNumber: string; accountHolderName: string; ifsc: string; branch: string | null; isPrimary: boolean; isActive?: boolean }
export interface ContactGstDetail { id?: string; contactId?: string; gstin: string; state: string; isDefault: boolean; isActive?: boolean }

export interface ContactRecord {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  code: string
  contactTypeId: string | null
  ledgerId: string | null
  ledgerName: string | null
  name: string
  legalName: string | null
  pan: string | null
  gstin: string | null
  msmeType: string | null
  msmeNo: string | null
  tan: string | null
  tdsAvailable: boolean
  tcsAvailable: boolean
  openingBalance: number
  balanceType: string | null
  creditLimit: number
  website: string | null
  description: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  addresses: ContactAddress[]
  emails: ContactEmail[]
  phones: ContactPhone[]
  socialLinks: ContactSocialLink[]
  bankAccounts: ContactBankAccount[]
  gstDetails: ContactGstDetail[]
}

export type ContactInput = Partial<ContactRecord> & {
  addresses: ContactAddress[]
  emails: ContactEmail[]
  phones: ContactPhone[]
  socialLinks: ContactSocialLink[]
  bankAccounts: ContactBankAccount[]
  gstDetails: ContactGstDetail[]
}

type RawContactRecord = Partial<ContactRecord> & {
  contact_type_id?: unknown
  created_at?: unknown
  deleted_at?: unknown
  is_active?: unknown
  ledger_id?: unknown
  ledger_name?: unknown
  legal_name?: unknown
  msme_no?: unknown
  msme_type?: unknown
  opening_balance?: unknown
  balance_type?: unknown
  credit_limit?: unknown
  primary_email?: unknown
  primary_phone?: unknown
  tcs_available?: unknown
  tds_available?: unknown
  updated_at?: unknown
}

export function emptyContact(): ContactInput {
  return {
    code: "",
    contactTypeId: null,
    ledgerId: null,
    ledgerName: null,
    name: "",
    legalName: "",
    pan: "",
    gstin: "",
    msmeType: null,
    msmeNo: "",
    tan: "",
    tdsAvailable: false,
    tcsAvailable: false,
    openingBalance: 0,
    balanceType: null,
    creditLimit: 0,
    website: "",
    description: "",
    isActive: true,
    addresses: [emptyAddress()],
    emails: [{ email: "", emailType: "primary", isPrimary: true }],
    phones: [{ phoneNumber: "", phoneType: "mobile", isPrimary: true }],
    socialLinks: [],
    bankAccounts: [],
    gstDetails: [],
  }
}

export function emptyAddress(): ContactAddress {
  return {
    addressTypeId: null,
    addressLine1: "",
    addressLine2: "",
    cityId: null,
    districtId: null,
    stateId: null,
    countryId: null,
    pincodeId: null,
    latitude: null,
    longitude: null,
    isDefault: true,
  }
}

export async function listContacts(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Contact list failed with status ${response.status}.`)
  const records = (await response.json()) as RawContactRecord[]
  return records.map(normalizeContactRecord)
}

export async function upsertContact(session: AuthSession, input: ContactInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, `Contact save failed with status ${response.status}.`))
  const result = (await response.json()) as { ok: boolean; record?: ContactRecord; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? "Contact save failed.")
  return normalizeContactRecord(result.record)
}

export async function destroyContact(session: AuthSession, contact: ContactRecord) {
  await mutateContact(session, contact.uuid, "destroy")
}

export async function restoreContact(session: AuthSession, contact: ContactRecord) {
  await mutateContact(session, contact.uuid, "restore")
}

async function mutateContact(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, `Contact ${action} failed with status ${response.status}.`))
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Contact ${action} failed.`)
}

function normalizeContactRecord(record: RawContactRecord): ContactRecord {
  const fallbackCode = String(record.code ?? record.uuid ?? record.id ?? "")
  const fallbackName = String(record.name ?? record.legalName ?? (fallbackCode || "Contact"))

  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid ?? fallbackCode),
    tenant_id: Number(record.tenant_id ?? 0),
    company_id: Number(record.company_id ?? 0),
    code: fallbackCode,
    contactTypeId: nullableString(record.contactTypeId ?? record.contact_type_id),
    ledgerId: nullableString(record.ledgerId ?? record.ledger_id),
    ledgerName: nullableString(record.ledgerName ?? record.ledger_name),
    name: fallbackName,
    legalName: nullableString(record.legalName ?? record.legal_name),
    pan: record.pan ?? null,
    gstin: record.gstin ?? null,
    msmeType: nullableString(record.msmeType ?? record.msme_type),
    msmeNo: nullableString(record.msmeNo ?? record.msme_no),
    tan: record.tan ?? null,
    tdsAvailable: booleanValue(record.tdsAvailable ?? record.tds_available),
    tcsAvailable: booleanValue(record.tcsAvailable ?? record.tcs_available),
    openingBalance: Number(record.openingBalance ?? record.opening_balance ?? 0),
    balanceType: nullableString(record.balanceType ?? record.balance_type),
    creditLimit: Number(record.creditLimit ?? record.credit_limit ?? 0),
    website: record.website ?? null,
    description: record.description ?? null,
    primaryEmail: nullableString(record.primaryEmail ?? record.primary_email),
    primaryPhone: nullableString(record.primaryPhone ?? record.primary_phone),
    isActive: booleanValue(record.isActive ?? record.is_active, true),
    createdAt: String(record.createdAt ?? record.created_at ?? ""),
    updatedAt: String(record.updatedAt ?? record.updated_at ?? ""),
    deletedAt: nullableString(record.deletedAt ?? record.deleted_at),
    addresses: Array.isArray(record.addresses) ? record.addresses : [],
    emails: Array.isArray(record.emails) ? record.emails.map(normalizeEmailRow) : [],
    phones: Array.isArray(record.phones) ? record.phones.map(normalizePhoneRow) : [],
    socialLinks: Array.isArray(record.socialLinks) ? record.socialLinks : [],
    bankAccounts: Array.isArray(record.bankAccounts) ? record.bankAccounts : [],
    gstDetails: Array.isArray(record.gstDetails) ? record.gstDetails : [],
  }
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value)
}

function booleanValue(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false"
  return Boolean(value)
}

function normalizeEmailRow(email: ContactEmail): ContactEmail {
  return { ...email, emailType: contactEmailTypes.includes(email.emailType as ContactEmailType) ? email.emailType as ContactEmailType : "other" }
}

function normalizePhoneRow(phone: ContactPhone): ContactPhone {
  return { ...phone, phoneType: contactPhoneTypes.includes(phone.phoneType as ContactPhoneType) ? phone.phoneType as ContactPhoneType : "other" }
}

async function responseErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("application/json")) {
      const body = await response.json() as { error?: unknown; message?: unknown }
      const message = body.error ?? body.message
      return typeof message === "string" && message.trim() ? message : fallback
    }

    const text = await response.text()
    return text.trim() || fallback
  } catch {
    return fallback
  }
}
