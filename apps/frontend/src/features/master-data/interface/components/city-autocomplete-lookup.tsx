import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "../../domain/master-data"
import { CommonRecordAutocompleteLookup, buildCommonRecordLookup, commonRecordLookupQueryKey, getCommonRecordName } from "./common-record-autocomplete-lookup"
import { buildCityCreateInput, hasSelectedLocationParent } from "./location-create-input"

export interface CityAutocompleteLookupProps {
  className?: string
  disabled?: boolean
  label?: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  placeholder?: string
  districtId?: unknown
  stateId?: unknown
  session: AuthSession
  value: unknown
}

export function CityAutocompleteLookup({
  className,
  disabled,
  label = "City",
  onChange,
  onOptionsChange,
  placeholder = "Search city name",
  districtId,
  stateId,
  session,
  value,
}: CityAutocompleteLookupProps) {
  return (
    <CommonRecordAutocompleteLookup
      allowCreate={hasSelectedLocationParent(districtId)}
      className={className}
      createInput={(name) => buildCityCreateInput(name, districtId)}
      createLabel="city"
      disabled={disabled}
      label={label}
      moduleKey="cities"
      onChange={onChange}
      onOptionsChange={onOptionsChange}
      optionFilter={(record) => matchesReference(record.district_id, districtId) && matchesReference(record.state_id, stateId)}
      placeholder={placeholder}
      session={session}
      value={value}
    />
  )
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

export function cityLookupQueryKey(session: AuthSession) {
  return commonRecordLookupQueryKey(session, "cities")
}

export function buildCityLookup(records: MasterDataRecord[]) {
  return buildCommonRecordLookup(records)
}

export function getCityName(record: MasterDataRecord) {
  return getCommonRecordName(record)
}
