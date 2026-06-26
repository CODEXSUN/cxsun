import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"

export interface PincodeAutocompleteLookupProps {
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
      createLabel="pincode"
      disabled={disabled}
      label={label}
      moduleKey="pincodes"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
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
