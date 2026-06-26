import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"
import { buildStateCreateInput, hasSelectedLocationParent } from "./location-create-input"

export interface StateAutocompleteLookupProps {
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  countryId?: unknown
  session: AuthSession
  value: unknown
}

export function StateAutocompleteLookup({
  className,
  disabled,
  label = "State",
  onChange,
  onOptionsChange,
  placeholder = "Search state name",
  countryId,
  session,
  value,
}: StateAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      allowCreate={hasSelectedLocationParent(countryId)}
      className={className}
      createInput={(name, records) => buildStateCreateInput(name, records, countryId)}
      createLabel="state"
      disabled={disabled}
      label={label}
      moduleKey="states"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      optionFilter={(record) => matchesReference(record.country_id, countryId)}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

export function stateLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "states")
}

export function buildStateLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getStateName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}
