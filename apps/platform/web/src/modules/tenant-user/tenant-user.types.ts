export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUser = {
  id: number;
  isProtected: boolean;
  email: string;
  name: string;
  password?: string;
  roles: { id: number; label: string }[];
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  name: string;
  password?: string;
  roleId: number;
  status: TenantUserStatus;
};
export type TenantUserListFilters = { search?: string };
export type TenantUserRoleOption = {
  id: number;
  key: string;
  label: string;
  status: "active" | "inactive";
};
export type TenantUserScope = { desk: "tenant" } | { desk: "sa"; tenantId: number };
export type TenantUserTenantLookup = {
  id: number;
  status: string;
  tenantCode: string;
  tenantName: string;
};
