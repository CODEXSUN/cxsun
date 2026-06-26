import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"

export function hasSelectedLocationParent(value: unknown) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

export function buildStateCreateInput(
  name: string,
  records: MasterDataRecord[],
  countryId: unknown,
): MasterDataUpsertInput {
  return {
    code: buildShortCode(name, records),
    country_id: requiredParentId(countryId, "country"),
    is_active: true,
    name,
  }
}

export function buildDistrictCreateInput(name: string, stateId: unknown): MasterDataUpsertInput {
  return {
    is_active: true,
    name,
    state_id: requiredParentId(stateId, "state"),
  }
}

export function buildCityCreateInput(name: string, districtId: unknown): MasterDataUpsertInput {
  return {
    district_id: requiredParentId(districtId, "district"),
    is_active: true,
    name,
  }
}

function requiredParentId(value: unknown, label: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Select a ${label} before creating this record.`)
  }
  return id
}

function buildShortCode(name: string, records: MasterDataRecord[]) {
  const existingCodes = new Set(records.map((record) => String(record.code ?? "").toUpperCase()))
  const normalizedWords = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  const initials = normalizedWords.length > 1 ? normalizedWords.map((word) => word[0]).join("") : ""
  const plain = normalizedWords.join("")
  const base = (initials || plain || "REC").slice(0, 6).padEnd(2, "X")

  if (!existingCodes.has(base)) return base

  for (let index = 2; index < 1000; index += 1) {
    const suffix = String(index)
    const candidate = `${base.slice(0, Math.max(1, 6 - suffix.length))}${suffix}`
    if (!existingCodes.has(candidate)) return candidate
  }

  return `${base.slice(0, 4)}${Date.now().toString(36).slice(-2).toUpperCase()}`
}
