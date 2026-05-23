import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"

export interface PincodeAutocompleteLookupProps {
  cityId?: unknown
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  session: AuthSession
  value: unknown
}

export function PincodeAutocompleteLookup({
  cityId,
  className,
  disabled,
  label = "Pincode",
  onChange,
  onOptionsChange,
  placeholder = "Search pincode",
  session,
  value,
}: PincodeAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      className={className}
      createInput={(name) => buildPincodeCreateInput(name, cityId)}
      createLabel="pincode"
      disabled={disabled}
      label={label}
      moduleKey="pincodes"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      optionFilter={(record) => matchesReference(record.city_id, cityId)}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

export function pincodeLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "pincodes")
}

export function buildPincodeLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getPincodeName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}

function buildPincodeCreateInput(name: string, cityId: unknown): MasterDataUpsertInput {
  return {
    city_id: cityId === null || cityId === undefined || cityId === "" ? 1 : Number(cityId),
    is_active: true,
    name,
  }
}
