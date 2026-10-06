import { TenantRepository } from "./modules/tenant/tenant.repository.js";
import type { Tenant } from "./modules/tenant/tenant.types.js";
import { env } from "./env.js";
import { assertSingleTenantRecords } from "./tenancy-policy.js";

export function isSingleTenantMode() {
  return env.CXSUN_TENANCY_MODE === "single";
}

export async function configuredSingleTenant(repository = new TenantRepository()): Promise<Tenant> {
  const tenant = await repository.findByCorporateId(env.CXSUN_SINGLE_TENANT_CORPORATE_ID);
  if (!tenant || tenant.status !== "active") {
    throw new Error("Configured single tenant is missing or inactive.");
  }
  return tenant;
}

export async function assertSingleTenantRegistry(
  allowMissing: boolean,
  repository = new TenantRepository()
) {
  if (!isSingleTenantMode()) return;
  const tenants = await repository.list();
  if (allowMissing && tenants.length === 0) return;
  assertSingleTenantRecords(
    tenants,
    env.CXSUN_SINGLE_TENANT_CORPORATE_ID,
    env.ENABLE_DEFAULT_TENANT_SEED === "1" ? env.DEFAULT_TENANT_CORPORATE_ID : undefined
  );
}
