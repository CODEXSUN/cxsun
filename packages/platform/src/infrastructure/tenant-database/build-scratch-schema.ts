#!/usr/bin/env node

import type { Tenant } from '../../core/tenant/domain/tenant.types.js'
import { closeTenantDatabase, provisionTenantDatabase } from './tenant-database.connection.js'

const database = required('CXSYNC_SCRATCH_DB_NAME')
if (!/^cxsync_scratch_[a-z0-9_]+$/.test(database)) {
  throw new Error('Refusing to migrate a database without the CXSync scratch prefix.')
}

const now = new Date().toISOString()
const tenant: Tenant = {
  id: 0,
  code: 0,
  corporate_id: 'cxsync-scratch',
  mobile: null,
  slug: database,
  name: 'CXSync scratch schema',
  status: 'active',
  db_type: 'mariadb',
  db_host: required('CXSYNC_SCRATCH_DB_HOST'),
  db_port: Number(required('CXSYNC_SCRATCH_DB_PORT')),
  db_name: database,
  db_user: required('CXSYNC_SCRATCH_DB_USER'),
  db_secret_ref: 'CXSYNC_SCRATCH_DB_PASSWORD',
  company_count: 0,
  active_company_count: 0,
  company_concept_count: 0,
  payload_settings: '{}',
  created_at: now,
  updated_at: now,
  deleted_at: null,
}

try {
  await provisionTenantDatabase(tenant, { schemaOnly: true })
  process.stdout.write(`CXSync scratch schema ready: ${database}\n`)
} finally {
  await closeTenantDatabase(tenant)
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}
