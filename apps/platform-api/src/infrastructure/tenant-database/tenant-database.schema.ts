import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

type DateColumn = ColumnType<Date, Date | string | undefined, Date | string>
type JsonTextColumn = ColumnType<string, string | undefined, string>

export interface CompaniesTable {
  id: Generated<number>
  uuid: string | null
  tenant_id: number
  industry_id: number
  code: string
  name: string
  legal_name: string | null
  is_primary: ColumnType<boolean, boolean | number | undefined, boolean | number>
  is_active: ColumnType<boolean, boolean | number | undefined, boolean | number>
  status: string
  settings: JsonTextColumn
  features: JsonTextColumn
  created_at: DateColumn
  updated_at: DateColumn
  deleted_at: Date | string | null
}

export interface AccountingYearsTable {
  id: Generated<number>
  uuid: string | null
  name: string
  start_date: string
  end_date: string
  books_start: string
  is_current_year: ColumnType<boolean, boolean | number | undefined, boolean | number>
  is_active: ColumnType<boolean, boolean | number | undefined, boolean | number>
  created_at: DateColumn
  updated_at: DateColumn
  deleted_at: Date | string | null
}

export interface UsersTable {
  id: Generated<number>
  uuid: string | null
  name: string
  email: string
  password_hash: string
  status: string
  created_at: DateColumn
  updated_at: DateColumn
}

export interface UserTenantsTable {
  id: Generated<number>
  uuid: string | null
  user_id: number
  role: string
  status: string
  created_at: DateColumn
  updated_at: DateColumn
}

export interface RbacRolesTable {
  id: Generated<number>
  uuid: string | null
  code: string
  name: string
  settings: JsonTextColumn
  created_at: DateColumn
  updated_at: DateColumn
}

export interface RbacPoliciesTable {
  id: Generated<number>
  uuid: string | null
  code: string
  name: string
  description: string
  created_at: DateColumn
}

export interface RbacRolePoliciesTable {
  id: Generated<number>
  uuid: string | null
  role_code: string
  policy_code: string
  created_at: DateColumn
}

export interface DbVersionsTable {
  id: Generated<number>
  scope: string
  target_key: string
  version: string
  source: string
  metadata: string | null
  installed_at: DateColumn
  updated_at: DateColumn
}

export interface TenantDatabaseSchema {
  companies: CompaniesTable
  accounting_years: AccountingYearsTable
  users: UsersTable
  user_tenants: UserTenantsTable
  rbac_roles: RbacRolesTable
  rbac_policies: RbacPoliciesTable
  rbac_role_policies: RbacRolePoliciesTable
  db_versions: DbVersionsTable
}

export type CompanyRow = Selectable<CompaniesTable>
export type CompanyInsert = Insertable<CompaniesTable>
export type CompanyUpdate = Updateable<CompaniesTable>
export type TenantUserRow = Selectable<UsersTable>
export type TenantUserInsert = Insertable<UsersTable>
export type TenantUserUpdate = Updateable<UsersTable>
