import type { Tenant } from "./modules/tenant/tenant.types.js";

type TenantIdentity = Pick<Tenant, "corporateId" | "status" | "tenantCode">;

export function assertSingleTenantRecords(
  tenants: TenantIdentity[],
  configuredCorporateId: string,
  seededTenantCode?: string
) {
  const tenant = tenants[0];
  if (
    tenants.length !== 1 ||
    !tenant ||
    tenant.status !== "active" ||
    tenant.corporateId?.trim().toUpperCase() !== configuredCorporateId.trim().toUpperCase() ||
    (seededTenantCode !== undefined &&
      tenant.tenantCode.trim().toUpperCase() !== seededTenantCode.trim().toUpperCase())
  ) {
    throw new Error(
      "Single mode requires exactly one active tenant matching CXSUN_SINGLE_TENANT_CORPORATE_ID."
    );
  }
}
