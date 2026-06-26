import { sql } from 'kysely'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
import type { MasterRecord } from '../../../../foundation/master-record/domain/entities/master-record.entity.js'
import { MasterRecordRepository } from '../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { contactMasterDefinition } from '../../domain/value-objects/contact-master.definition.js'

@Injectable()
export class ContactMasterRepository {
  private readonly records = new MasterRecordRepository()

  async nextCode(context: TenantRuntimeContext) {
    await this.ensureCodeSequenceTable(context)
    const result = await sql<{ next_number: number }>`
      SELECT next_number
      FROM contact_code_sequences
      WHERE sequence_key = 'contact'
      LIMIT 1
    `.execute(context.database)

    return formatContactCode(Number(result.rows[0]?.next_number ?? 1))
  }

  async allocateNextCode(context: TenantRuntimeContext) {
    await this.ensureCodeSequenceTable(context)
    return context.database.transaction().execute(async (transaction) => {
      const result = await sql<{ next_number: number }>`
        SELECT next_number
        FROM contact_code_sequences
        WHERE sequence_key = 'contact'
        FOR UPDATE
      `.execute(transaction)
      const nextNumber = Number(result.rows[0]?.next_number ?? 1)

      await sql`
        INSERT INTO contact_code_sequences (sequence_key, next_number)
        VALUES ('contact', ${nextNumber + 1})
        ON DUPLICATE KEY UPDATE next_number = ${nextNumber + 1}
      `.execute(transaction)

      return formatContactCode(nextNumber)
    })
  }

  async synchronizeCode(context: TenantRuntimeContext, code: string) {
    const match = /^C-(\d+)$/i.exec(code.trim())
    if (!match) return

    await this.ensureCodeSequenceTable(context)
    const nextNumber = Number(match[1]) + 1
    await sql`
      INSERT INTO contact_code_sequences (sequence_key, next_number)
      VALUES ('contact', ${nextNumber})
      ON DUPLICATE KEY UPDATE
        next_number = GREATEST(contact_code_sequences.next_number, VALUES(next_number))
    `.execute(context.database)
  }

  async list(context: TenantRuntimeContext) {
    const rows = await this.records.list(context, contactMasterDefinition)
    return Promise.all(rows.map((row) => this.hydrate(context, row)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string) {
    const record = await this.records.find(context, contactMasterDefinition, idOrUuid)
    return record ? this.hydrate(context, record) : null
  }

  async insert(context: TenantRuntimeContext, input: Record<string, unknown>, source: Record<string, unknown> = input) {
    const record = await this.records.insert(context, contactMasterDefinition, input)
    await this.replaceChildren(context, Number(record.id), source)
    return this.find(context, String(record.uuid ?? record.id))
  }

  async update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>, source: Record<string, unknown> = input) {
    const record = await this.records.update(context, contactMasterDefinition, idOrUuid, input)
    if (!record) return null

    await this.replaceChildren(context, Number(record.id), source)
    return this.find(context, String(record.uuid ?? record.id))
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, contactMasterDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, contactMasterDefinition, idOrUuid)
  }

  private async ensureCodeSequenceTable(context: TenantRuntimeContext) {
    await sql`
      CREATE TABLE IF NOT EXISTS contact_code_sequences (
        sequence_key VARCHAR(80) NOT NULL PRIMARY KEY,
        next_number INT UNSIGNED NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `.execute(context.database)
    await sql`
      INSERT INTO contact_code_sequences (sequence_key, next_number)
      SELECT
        'contact',
        COALESCE(MAX(
          CASE
            WHEN code REGEXP '^C-[0-9]+$' THEN CAST(SUBSTRING(code, 3) AS UNSIGNED)
            ELSE 0
          END
        ), 0) + 1
      FROM masters_contacts
      ON DUPLICATE KEY UPDATE
        next_number = GREATEST(contact_code_sequences.next_number, VALUES(next_number))
    `.execute(context.database)
  }

  private async hydrate(context: TenantRuntimeContext, record: MasterRecord): Promise<MasterRecord> {
    const contactId = Number(record.id)
    const [addresses, emails, phones, socialLinks, bankAccounts, gstDetails] = await Promise.all([
      context.database
        .selectFrom('address_book')
        .selectAll()
        .where('owner_type', '=', 'contact')
        .where('owner_id', '=', contactId)
        .orderBy('is_default', 'desc')
        .orderBy('id', 'asc')
        .execute(),
      context.database
        .selectFrom('contact_emails')
        .selectAll()
        .where('contact_id', '=', contactId)
        .orderBy('is_primary', 'desc')
        .orderBy('id', 'asc')
        .execute(),
      context.database
        .selectFrom('contact_phones')
        .selectAll()
        .where('contact_id', '=', contactId)
        .orderBy('is_primary', 'desc')
        .orderBy('id', 'asc')
        .execute(),
      context.database
        .selectFrom('contact_social_links')
        .selectAll()
        .where('contact_id', '=', contactId)
        .orderBy('id', 'asc')
        .execute(),
      context.database
        .selectFrom('contact_bank_accounts')
        .selectAll()
        .where('contact_id', '=', contactId)
        .orderBy('is_primary', 'desc')
        .orderBy('id', 'asc')
        .execute(),
      context.database
        .selectFrom('contact_gst_details')
        .selectAll()
        .where('contact_id', '=', contactId)
        .orderBy('is_default', 'desc')
        .orderBy('id', 'asc')
        .execute(),
    ])

    return {
      ...record,
      primary_email: stringOrNull(record.primary_email) ?? stringOrNull(emails.find((email) => booleanValue(email.is_primary))?.email ?? emails[0]?.email),
      primary_phone: stringOrNull(record.primary_phone) ?? stringOrNull(phones.find((phone) => booleanValue(phone.is_primary))?.phone_number ?? phones[0]?.phone_number),
      addresses: addresses.map((address) => ({
        id: String(address.id),
        uuid: address.uuid,
        contactId: String(record.id),
        addressTypeId: stringOrNull(address.address_type_id),
        addressLine1: String(address.address_line1 ?? ''),
        addressLine2: stringOrNull(address.address_line2),
        cityId: stringOrNull(address.city_id),
        districtId: stringOrNull(address.district_id),
        stateId: stringOrNull(address.state_id),
        countryId: stringOrNull(address.country_id),
        pincodeId: stringOrNull(address.pincode_id),
        latitude: numberOrNull(address.latitude),
        longitude: numberOrNull(address.longitude),
        isDefault: booleanValue(address.is_default),
        isActive: booleanValue(address.is_active, true),
      })),
      emails: emails.map((email) => ({
        id: String(email.id),
        uuid: email.uuid,
        contactId: String(contactId),
        email: String(email.email ?? ''),
        emailType: String(email.email_type ?? 'primary'),
        isPrimary: booleanValue(email.is_primary),
        isActive: booleanValue(email.is_active, true),
      })),
      phones: phones.map((phone) => ({
        id: String(phone.id),
        uuid: phone.uuid,
        contactId: String(contactId),
        phoneNumber: String(phone.phone_number ?? ''),
        phoneType: String(phone.phone_type ?? 'mobile'),
        isPrimary: booleanValue(phone.is_primary),
        isActive: booleanValue(phone.is_active, true),
      })),
      socialLinks: socialLinks.map((link) => ({
        id: String(link.id),
        uuid: link.uuid,
        contactId: String(contactId),
        platform: String(link.platform ?? ''),
        url: String(link.url ?? ''),
        isActive: booleanValue(link.is_active, true),
      })),
      bankAccounts: bankAccounts.map((bank) => ({
        id: String(bank.id),
        uuid: bank.uuid,
        contactId: String(contactId),
        bankName: String(bank.bank_name ?? ''),
        accountNumber: String(bank.account_number ?? ''),
        accountHolderName: String(bank.account_holder_name ?? ''),
        ifsc: String(bank.ifsc ?? ''),
        branch: stringOrNull(bank.branch),
        isPrimary: booleanValue(bank.is_primary),
        isActive: booleanValue(bank.is_active, true),
      })),
      gstDetails: gstDetails.map((gst) => ({
        id: String(gst.id),
        uuid: gst.uuid,
        contactId: String(contactId),
        gstin: String(gst.gstin ?? ''),
        state: String(gst.state ?? ''),
        isDefault: booleanValue(gst.is_default),
        isActive: booleanValue(gst.is_active, true),
      })),
    }
  }

  private async replaceChildren(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    await this.replaceAddresses(context, contactId, source)
    await this.replaceEmails(context, contactId, source)
    await this.replacePhones(context, contactId, source)
    await this.replaceSocialLinks(context, contactId, source)
    await this.replaceBankAccounts(context, contactId, source)
    await this.replaceGstDetails(context, contactId, source)
  }

  private async replaceAddresses(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const addresses = await this.resolveAddressDefaults(context, normalizeAddresses(source.addresses))

    await context.database
      .deleteFrom('address_book')
      .where('owner_type', '=', 'contact')
      .where('owner_id', '=', contactId)
      .execute()

    if (!addresses.length) return

    await context.database
      .insertInto('address_book')
      .values(addresses.map((address) => ({
        uuid: dispatchPublicUuid(),
        owner_type: 'contact',
        owner_id: contactId,
        address_type_id: address.addressTypeId,
        address_line1: address.addressLine1,
        address_line2: address.addressLine2,
        city_id: address.cityId,
        district_id: address.districtId,
        state_id: address.stateId,
        country_id: address.countryId,
        pincode_id: address.pincodeId,
        latitude: address.latitude,
        longitude: address.longitude,
        is_default: address.isDefault,
        is_active: address.isActive,
      })))
      .execute()
  }

  private async replaceSocialLinks(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const socialLinks = normalizeSocialLinks(source.socialLinks)

    await context.database
      .deleteFrom('contact_social_links')
      .where('contact_id', '=', contactId)
      .execute()

    if (!socialLinks.length) return

    await context.database
      .insertInto('contact_social_links')
      .values(socialLinks.map((link) => ({
        uuid: dispatchPublicUuid(),
        contact_id: contactId,
        platform: link.platform,
        url: link.url,
        is_active: link.isActive,
      })))
      .execute()
  }

  private async replaceBankAccounts(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const bankAccounts = normalizeBankAccounts(source.bankAccounts)

    await context.database
      .deleteFrom('contact_bank_accounts')
      .where('contact_id', '=', contactId)
      .execute()

    if (!bankAccounts.length) return

    await context.database
      .insertInto('contact_bank_accounts')
      .values(bankAccounts.map((bank) => ({
        uuid: dispatchPublicUuid(),
        contact_id: contactId,
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_holder_name: bank.accountHolderName,
        ifsc: bank.ifsc,
        branch: bank.branch,
        is_primary: bank.isPrimary,
        is_active: bank.isActive,
      })))
      .execute()
  }

  private async replaceGstDetails(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const gstDetails = normalizeGstDetails(source.gstDetails)

    await context.database
      .deleteFrom('contact_gst_details')
      .where('contact_id', '=', contactId)
      .execute()

    if (!gstDetails.length) return

    await context.database
      .insertInto('contact_gst_details')
      .values(gstDetails.map((gst) => ({
        uuid: dispatchPublicUuid(),
        contact_id: contactId,
        gstin: gst.gstin,
        state: gst.state,
        is_default: gst.isDefault,
        is_active: gst.isActive,
      })))
      .execute()
  }

  private async replaceEmails(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const emails = normalizeEmails(source.emails)

    await context.database
      .deleteFrom('contact_emails')
      .where('contact_id', '=', contactId)
      .execute()

    if (!emails.length) return

    await context.database
      .insertInto('contact_emails')
      .values(emails.map((email) => ({
        uuid: dispatchPublicUuid(),
        contact_id: contactId,
        email: email.email,
        email_type: email.emailType,
        is_primary: email.isPrimary,
        is_active: email.isActive,
      })))
      .execute()
  }

  private async replacePhones(context: TenantRuntimeContext, contactId: number, source: Record<string, unknown>) {
    const phones = normalizePhones(source.phones)

    await context.database
      .deleteFrom('contact_phones')
      .where('contact_id', '=', contactId)
      .execute()

    if (!phones.length) return

    await context.database
      .insertInto('contact_phones')
      .values(phones.map((phone) => ({
        uuid: dispatchPublicUuid(),
        contact_id: contactId,
        phone_number: phone.phoneNumber,
        phone_type: phone.phoneType,
        is_primary: phone.isPrimary,
        is_active: phone.isActive,
      })))
      .execute()
  }

  private async resolveAddressDefaults(context: TenantRuntimeContext, addresses: NormalizedContactAddress[]) {
    const resolved: NormalizedContactAddress[] = []

    for (const address of addresses) {
      const addressTypeId = address.addressTypeId ?? await firstCommonId(context, 'common_address_types')
      const countryId = address.countryId ?? await firstCommonId(context, 'common_countries')
      const stateId = address.stateId ?? await firstCommonId(context, 'common_states', countryId ? [['country_id', countryId]] : [])
      const districtId = address.districtId ?? await firstCommonId(context, 'common_districts', stateId ? [['state_id', stateId]] : [])
      const cityId = address.cityId ?? await firstCommonId(context, 'common_cities', districtId ? [['district_id', districtId]] : [])
      const pincodeId = address.pincodeId

      resolved.push({
        ...address,
        addressTypeId,
        countryId,
        stateId,
        districtId,
        cityId,
        pincodeId,
      })
    }

    return resolved
  }
}

function formatContactCode(number: number) {
  return `C-${String(Math.max(1, number)).padStart(4, '0')}`
}

interface NormalizedContactAddress {
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
  isActive: boolean
}

interface NormalizedContactEmail {
  email: string
  emailType: string
  isPrimary: boolean
  isActive: boolean
}

interface NormalizedContactPhone {
  phoneNumber: string
  phoneType: string
  isPrimary: boolean
  isActive: boolean
}

interface NormalizedContactSocialLink {
  platform: string
  url: string
  isActive: boolean
}

interface NormalizedContactBankAccount {
  bankName: string
  accountNumber: string
  accountHolderName: string
  ifsc: string
  branch: string | null
  isPrimary: boolean
  isActive: boolean
}

interface NormalizedContactGstDetail {
  gstin: string
  state: string
  isDefault: boolean
  isActive: boolean
}

function normalizeAddresses(value: unknown): NormalizedContactAddress[] {
  if (!Array.isArray(value)) return []

  return value
    .map((address) => normalizeAddress(address))
    .filter((address): address is NormalizedContactAddress => address !== null)
}

function normalizeAddress(value: unknown): NormalizedContactAddress | null {
  if (!value || typeof value !== 'object') return null

  const address = value as Record<string, unknown>
  const addressLine1 = String(address.addressLine1 ?? address.address_line1 ?? '').trim()
  if (!addressLine1) return null

  return {
    addressTypeId: stringOrNull(address.addressTypeId ?? address.address_type_id),
    addressLine1,
    addressLine2: stringOrNull(address.addressLine2 ?? address.address_line2),
    cityId: stringOrNull(address.cityId ?? address.city_id),
    districtId: stringOrNull(address.districtId ?? address.district_id),
    stateId: stringOrNull(address.stateId ?? address.state_id),
    countryId: stringOrNull(address.countryId ?? address.country_id),
    pincodeId: stringOrNull(address.pincodeId ?? address.pincode_id),
    latitude: numberOrNull(address.latitude),
    longitude: numberOrNull(address.longitude),
    isDefault: booleanValue(address.isDefault ?? address.is_default),
    isActive: booleanValue(address.isActive ?? address.is_active, true),
  }
}

function normalizeEmails(value: unknown): NormalizedContactEmail[] {
  if (!Array.isArray(value)) return []

  return value
    .map((email) => normalizeEmail(email))
    .filter((email): email is NormalizedContactEmail => email !== null)
}

function normalizeEmail(value: unknown): NormalizedContactEmail | null {
  if (!value || typeof value !== 'object') return null

  const email = value as Record<string, unknown>
  const emailText = String(email.email ?? '').trim()
  if (!emailText) return null

  return {
    email: emailText,
    emailType: String(email.emailType ?? email.email_type ?? 'primary').trim() || 'primary',
    isPrimary: booleanValue(email.isPrimary ?? email.is_primary),
    isActive: booleanValue(email.isActive ?? email.is_active, true),
  }
}

function normalizePhones(value: unknown): NormalizedContactPhone[] {
  if (!Array.isArray(value)) return []

  return value
    .map((phone) => normalizePhone(phone))
    .filter((phone): phone is NormalizedContactPhone => phone !== null)
}

function normalizePhone(value: unknown): NormalizedContactPhone | null {
  if (!value || typeof value !== 'object') return null

  const phone = value as Record<string, unknown>
  const phoneNumber = String(phone.phoneNumber ?? phone.phone_number ?? '').trim()
  if (!phoneNumber) return null

  return {
    phoneNumber,
    phoneType: String(phone.phoneType ?? phone.phone_type ?? 'mobile').trim() || 'mobile',
    isPrimary: booleanValue(phone.isPrimary ?? phone.is_primary),
    isActive: booleanValue(phone.isActive ?? phone.is_active, true),
  }
}

function normalizeSocialLinks(value: unknown): NormalizedContactSocialLink[] {
  if (!Array.isArray(value)) return []

  return value
    .map((link) => normalizeSocialLink(link))
    .filter((link): link is NormalizedContactSocialLink => link !== null)
}

function normalizeSocialLink(value: unknown): NormalizedContactSocialLink | null {
  if (!value || typeof value !== 'object') return null

  const link = value as Record<string, unknown>
  const platform = String(link.platform ?? '').trim()
  const url = String(link.url ?? '').trim()
  if (!platform || !url) return null

  return {
    platform,
    url,
    isActive: booleanValue(link.isActive ?? link.is_active, true),
  }
}

function normalizeBankAccounts(value: unknown): NormalizedContactBankAccount[] {
  if (!Array.isArray(value)) return []

  return value
    .map((bank) => normalizeBankAccount(bank))
    .filter((bank): bank is NormalizedContactBankAccount => bank !== null)
}

function normalizeBankAccount(value: unknown): NormalizedContactBankAccount | null {
  if (!value || typeof value !== 'object') return null

  const bank = value as Record<string, unknown>
  const bankName = String(bank.bankName ?? bank.bank_name ?? '').trim()
  const accountNumber = String(bank.accountNumber ?? bank.account_number ?? '').trim()
  if (!bankName && !accountNumber) return null

  return {
    bankName,
    accountNumber,
    accountHolderName: String(bank.accountHolderName ?? bank.account_holder_name ?? '').trim(),
    ifsc: String(bank.ifsc ?? '').trim(),
    branch: stringOrNull(bank.branch),
    isPrimary: booleanValue(bank.isPrimary ?? bank.is_primary),
    isActive: booleanValue(bank.isActive ?? bank.is_active, true),
  }
}

function normalizeGstDetails(value: unknown): NormalizedContactGstDetail[] {
  if (!Array.isArray(value)) return []

  return value
    .map((gst) => normalizeGstDetail(gst))
    .filter((gst): gst is NormalizedContactGstDetail => gst !== null)
}

function normalizeGstDetail(value: unknown): NormalizedContactGstDetail | null {
  if (!value || typeof value !== 'object') return null

  const gst = value as Record<string, unknown>
  const gstin = String(gst.gstin ?? '').trim().toUpperCase()
  if (!gstin) return null

  return {
    gstin,
    state: String(gst.state ?? '').trim(),
    isDefault: booleanValue(gst.isDefault ?? gst.is_default),
    isActive: booleanValue(gst.isActive ?? gst.is_active, true),
  }
}

function stringOrNull(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function numberOrNull(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function booleanValue(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value !== '0' && value.toLowerCase() !== 'false'
  return Boolean(value)
}

async function firstCommonId(context: TenantRuntimeContext, tableName: string, filters: Array<[string, string | null]> = []) {
  const clauses = [sql`is_active = ${true}`]

  for (const [column, value] of filters) {
    const id = Number(value)
    if (Number.isFinite(id) && id > 0) {
      clauses.push(sql`${sql.ref(column)} = ${id}`)
    }
  }

  const result = await sql<{ id: number | string }>`
    SELECT id
    FROM ${sql.table(tableName)}
    WHERE ${sql.join(clauses, sql` AND `)}
    ORDER BY id ASC
    LIMIT 1
  `.execute(context.database)

  const id = result.rows[0]?.id
  return id === null || id === undefined ? null : String(id)
}
