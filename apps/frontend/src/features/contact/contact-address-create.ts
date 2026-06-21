import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import type { ContactAddress, ContactRecord } from "./contact-client"

export interface CreatedContactAddress {
  address: ContactAddress
  text: string
}

export async function resolveCreatedContactAddress(session: AuthSession, contact: ContactRecord, draft: ContactAddress): Promise<CreatedContactAddress> {
  const address = findPersistedAddress(contact.addresses, draft) ?? draft
  const modules = ["countries", "states", "districts", "cities", "pincodes"] as const
  const records = await Promise.all(modules.map((moduleKey) => listMasterDataRecords(session, moduleKey)))
  const labels = Object.fromEntries(modules.map((moduleKey, index) => [moduleKey, recordLabelMap(records[index])])) as Record<(typeof modules)[number], Map<string, string>>

  return {
    address,
    text: [
      address.addressLine1,
      address.addressLine2,
      lookupLabel(labels.cities, address.cityId),
      lookupLabel(labels.districts, address.districtId),
      lookupLabel(labels.states, address.stateId),
      lookupLabel(labels.countries, address.countryId),
      lookupLabel(labels.pincodes, address.pincodeId),
    ].filter(Boolean).join(", "),
  }
}

function findPersistedAddress(addresses: ContactAddress[], draft: ContactAddress) {
  const line1 = normalize(draft.addressLine1)
  const line2 = normalize(draft.addressLine2)
  return addresses.find((address) => normalize(address.addressLine1) === line1 && normalize(address.addressLine2) === line2)
    ?? addresses.findLast((address) => normalize(address.addressLine1) === line1)
}

function recordLabelMap(records: MasterDataRecord[]) {
  return new Map(records.map((record) => [String(record.id), String(record.name ?? record.code ?? record.description ?? record.id).trim()]))
}

function lookupLabel(map: Map<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  return map.get(String(value)) ?? ""
}

function normalize(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}
