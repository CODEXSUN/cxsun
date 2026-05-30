export function isSiteDeveloperMode() {
  const value = import.meta.env.DEVELOPER_MODE ?? ''
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}
