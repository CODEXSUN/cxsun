import { TenantListPage } from "src/features/tenant/interface/pages/tenant-list-page"
import type { AuthSession } from "src/features/auth/auth-client"

export function TenantView({ session }: { session: AuthSession }) {
  return <TenantListPage session={session} />
}
