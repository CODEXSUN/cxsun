import { sql } from 'kysely'
import { closeDatabase, getDatabase } from '@cxsun/platform/infrastructure/database/connection.js'
import { hashPassword } from '@cxsun/platform/infrastructure/auth/password-hash.js'
import { signJwt } from '@cxsun/platform/infrastructure/auth/jwt.js'
import { dbConfig } from '@cxsun/platform/framework/config/index.js'
import { closeTenantDatabase, dropTenantDatabase, getTenantDatabase, setupTenantClientDatabase } from '@cxsun/platform/infrastructure/tenant-database/tenant-database.connection.js'
import { startBillingApi } from '../src/runtime.js'

const port = Number(process.env.BILLING_API_MUTATION_E2E_PORT ?? 6298)
const marker = `billing_e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const tenantSlug = marker.replace(/[^a-z0-9_]/g, '_')
const adminEmail = `${marker}@example.test`
const adminPassword = `Password-${marker}`

const runtime = await startBillingApi({ port })
let failure: unknown
let tenant: Record<string, unknown> | undefined
let adminUserId: number | undefined
let companyId = 0
let accountingYearId = 0

try {
  await cleanupStaleMutationRows()
  await seedAdmin()
  tenant = await seedTenant()
  await setupTenantClientDatabase(tenant as never)
  const tenantDatabase = getTenantDatabase(tenant as never)
  assertEqual(await tenantTableExists(tenantDatabase, 'sales_entries'), true, 'billing tenant tables are provisioned')
  assertEqual(await tenantTableExists(tenantDatabase, 'crm_pipelines'), false, 'disabled crm tables are not provisioned')
  assertEqual(await tenantTableExists(tenantDatabase, 'ecommerce_store_settings'), false, 'disabled ecommerce tables are not provisioned')
  assertEqual(await tenantTableExists(tenantDatabase, 'site_sliders'), false, 'disabled site tables are not provisioned')
  ;({ companyId, accountingYearId } = await defaultTenantContextIds())
  await ensureDefaultMoneyLedgers()

  const authHeaders = {
    authorization: `Bearer ${signJwt({
      sub: adminUserId ?? 0,
      email: adminEmail,
      role: 'super-admin',
      tenantCode: 'super-admin',
      identitySource: 'platform',
      superAdmin: true,
    })}`,
    'x-tenant-code': tenantSlug,
  }

  const today = new Date().toISOString().slice(0, 10)
  await mutateContactAddress(authHeaders)
  await mutateSalesPurchasePopupSuite(today, authHeaders)
  await mutateCustomerEntry({
    label: 'sales',
    path: '/api/v1/entries/sales',
    numberKey: 'invoice_no',
    nameKey: 'customer_name',
    createNo: `SAL-${marker}`,
    updateNo: `SAL-${marker}`,
    createName: `Sales Customer ${marker}`,
    updateName: `Sales Customer Updated ${marker}`,
    dateKey: 'invoice_date',
    date: today,
    authHeaders,
    extra: { accounting_posting_mode: 'none' },
  })
  await mutateCustomerEntry({
    label: 'quotation',
    path: '/api/v1/entries/quotation',
    numberKey: 'invoice_no',
    nameKey: 'customer_name',
    createNo: `QUO-${marker}`,
    updateNo: `QUO-${marker}`,
    createName: `Quotation Customer ${marker}`,
    updateName: `Quotation Customer Updated ${marker}`,
    dateKey: 'invoice_date',
    date: today,
    authHeaders,
  })
  await mutateCustomerEntry({
    label: 'export sales',
    path: '/api/v1/entries/export-sales',
    numberKey: 'invoice_no',
    nameKey: 'customer_name',
    createNo: `EXP-${marker}`,
    updateNo: `EXP-${marker}`,
    createName: `Export Customer ${marker}`,
    updateName: `Export Customer Updated ${marker}`,
    dateKey: 'invoice_date',
    date: today,
    authHeaders,
  })
  await mutateCustomerEntry({
    label: 'purchase',
    path: '/api/v1/entries/purchase',
    numberKey: 'entry_no',
    nameKey: 'supplier_name',
    createNo: `PUR-${marker}`,
    updateNo: `PUR-${marker}`,
    createName: `Purchase Supplier ${marker}`,
    updateName: `Purchase Supplier Updated ${marker}`,
    dateKey: 'entry_date',
    date: today,
    authHeaders,
    extra: { accounting_posting_mode: 'none' },
  })
  await mutateReceiptAllocation(today, authHeaders)
  await mutatePaymentAllocation(today, authHeaders)
  await mutateCustomerEntry({
    label: 'purchase receipt',
    path: '/api/v1/stock/inward/purchase-receipts',
    numberKey: 'entry_no',
    nameKey: 'supplier_name',
    createNo: `PR-${marker}`,
    updateNo: `PR-${marker}`,
    createName: `Receipt Supplier ${marker}`,
    updateName: `Receipt Supplier Updated ${marker}`,
    dateKey: 'entry_date',
    date: today,
    authHeaders,
  })
  await mutateCustomerEntry({
    label: 'delivery note',
    path: '/api/v1/stock/outward/delivery-notes',
    numberKey: 'entry_no',
    nameKey: 'supplier_name',
    createNo: `DN-${marker}`,
    updateNo: `DN-${marker}`,
    createName: `Delivery Supplier ${marker}`,
    updateName: `Delivery Supplier Updated ${marker}`,
    dateKey: 'entry_date',
    date: today,
    authHeaders,
  })

  const settings = await postJson('/api/v1/stock/ledger/settings', {
    serialization_enabled: false,
    batch_enabled: false,
    default_warehouse_name: `Warehouse ${marker}`,
    serial_format: '{###}',
    batch_format: '{yy}',
    barcode_format: '{serialNo}',
    barcode_mode: 'numeric',
  }, authHeaders)
  assertOk(settings, 'stock settings update')
  assertEqual(objectValue(settings.settings, 'settings').barcode_mode, 'numeric', 'stock settings barcode mode')

  const ledger = await postJson('/api/v1/stock/ledger/entries/upsert', {
    entry_no: `SL-${marker}`,
    entry_date: today,
    source_no: `PR-${marker}`,
    notes: `Created ${marker}`,
    status: 'draft',
  }, authHeaders)
  assertOk(ledger, 'stock ledger create')
  const ledgerEntry = objectValue(ledger.entry, 'stock ledger entry')
  const ledgerUuid = stringValue(ledgerEntry.uuid, 'stock ledger uuid')

  const updatedLedger = await postJson('/api/v1/stock/ledger/entries/upsert', {
    uuid: ledgerUuid,
    entry_no: `SL-${marker}`,
    entry_date: today,
    source_no: `PR-${marker}`,
    notes: `Updated ${marker}`,
    status: 'posted',
  }, authHeaders)
  assertOk(updatedLedger, 'stock ledger update')
  assertEqual(objectValue(updatedLedger.entry, 'updated stock ledger').status, 'posted', 'stock ledger status updated')

  const dbResult = await sql<{ database_name: string }>`SELECT DATABASE() AS database_name`.execute(getDatabase())
  const databaseName = dbResult.rows[0]?.database_name
  if (!databaseName) throw new Error('Expected MariaDB database name in mutation e2e.')

  console.log(`Billing API mutation e2e ok: create/update flows + MariaDB ${databaseName} + tenant ${tenantSlug}`)
} catch (error) {
  failure = error
} finally {
  await cleanupMutationRows()
  await runtime.app.app.close()
  await closeDatabase()
}

if (failure) {
  console.error(failure)
  process.exitCode = 1
}

async function mutateContactAddress(authHeaders: Record<string, string>) {
  const initialCode = objectValue(await getJson('/api/v1/contacts/next-code', authHeaders), 'initial contact code')
  assertEqual(initialCode.code, 'C-0001', 'initial contact code preview')

  const country = await createCommonRecord('countries', {
    name: `Country ${marker}`,
    code: `C${marker.slice(-4)}`.toUpperCase(),
    phone_code: '+91',
    is_active: true,
  }, authHeaders)
  const state = await createCommonRecord('states', {
    name: `State ${marker}`,
    code: `S${marker.slice(-4)}`.toUpperCase(),
    country_id: Number(country.id),
    is_active: true,
  }, authHeaders)
  const district = await createCommonRecord('districts', {
    name: `District ${marker}`,
    state_id: Number(state.id),
    is_active: true,
  }, authHeaders)
  const city = await createCommonRecord('cities', {
    name: `City ${marker}`,
    district_id: Number(district.id),
    is_active: true,
  }, authHeaders)
  const pincode = await createCommonRecord('pincodes', {
    name: '641001',
    is_active: true,
  }, authHeaders)

  const created = await postJson('/api/v1/contacts/upsert', {
    code: '',
    name: `Contact ${marker}`,
    legal_name: `Contact ${marker}`,
    is_active: true,
    addresses: [{
      addressLine1: `Address ${marker}`,
      addressLine2: 'Second line',
      countryId: String(country.id),
      stateId: String(state.id),
      districtId: String(district.id),
      cityId: String(city.id),
      pincodeId: String(pincode.id),
      isDefault: true,
      isActive: true,
    }],
  }, authHeaders)
  assertOk(created, 'contact with address create')
  const contact = objectValue(created.record, 'contact record')
  assertEqual(contact.code, 'C-0001', 'allocated contact code')
  const uuid = stringValue(contact.uuid, 'contact uuid')
  assertContactAddress(objectValue(contact, 'created contact'), { country, state, district, city, pincode })

  const fetched = objectValue(await getJson(`/api/v1/contacts/${encodeURIComponent(uuid)}`, authHeaders), 'fetched contact')
  assertContactAddress(fetched, { country, state, district, city, pincode })

  const nextCode = objectValue(await getJson('/api/v1/contacts/next-code', authHeaders), 'next contact code')
  assertEqual(nextCode.code, 'C-0002', 'next contact code after create')

  const concurrent = await Promise.all([
    postJson('/api/v1/contacts/upsert', { code: '', name: `Concurrent A ${marker}`, is_active: true }, authHeaders),
    postJson('/api/v1/contacts/upsert', { code: '', name: `Concurrent B ${marker}`, is_active: true }, authHeaders),
  ])
  const concurrentCodes = concurrent
    .map((result, index) => stringValue(objectValue(result.record, `concurrent contact ${index + 1}`).code, `concurrent contact ${index + 1} code`))
    .sort()
  assertEqual(concurrentCodes.join(','), 'C-0002,C-0003', 'concurrent contact codes')

  const finalCode = objectValue(await getJson('/api/v1/contacts/next-code', authHeaders), 'final contact code')
  assertEqual(finalCode.code, 'C-0004', 'next contact code after concurrent creates')
}

async function createCommonRecord(moduleKey: string, payload: Record<string, unknown>, authHeaders: Record<string, string>) {
  const result = await postJson(`/api/v1/common/${moduleKey}/upsert`, payload, authHeaders)
  assertOk(result, `${moduleKey} create`)
  return objectValue(result.record, `${moduleKey} record`)
}

function assertContactAddress(
  contact: Record<string, unknown>,
  expected: Record<'country' | 'state' | 'district' | 'city' | 'pincode', Record<string, unknown>>,
) {
  if (!Array.isArray(contact.addresses) || contact.addresses.length !== 1) {
    throw new Error(`Expected one persisted contact address, received ${JSON.stringify(contact.addresses)}`)
  }
  const address = objectValue(contact.addresses[0], 'contact address')
  assertEqual(address.countryId, String(expected.country.id), 'contact address country')
  assertEqual(address.stateId, String(expected.state.id), 'contact address state')
  assertEqual(address.districtId, String(expected.district.id), 'contact address district')
  assertEqual(address.cityId, String(expected.city.id), 'contact address city')
  assertEqual(address.pincodeId, String(expected.pincode.id), 'contact address pincode')
  assertEqual(address.isDefault, true, 'contact address default')
}

async function mutateSalesPurchasePopupSuite(today: string, authHeaders: Record<string, string>) {
  const country = await createCommonRecord('countries', { name: `Popup Country ${marker}`, code: `PC${marker.slice(-4)}`.toUpperCase(), phone_code: '+91', is_active: true }, authHeaders)
  const state = await createCommonRecord('states', { name: `Popup State ${marker}`, code: `PS${marker.slice(-4)}`.toUpperCase(), country_id: Number(country.id), is_active: true }, authHeaders)
  const district = await createCommonRecord('districts', { name: `Popup District ${marker}`, state_id: Number(state.id), is_active: true }, authHeaders)
  const city = await createCommonRecord('cities', { name: `Popup City ${marker}`, district_id: Number(district.id), is_active: true }, authHeaders)
  const pincode = await createCommonRecord('pincodes', { name: '641002', is_active: true }, authHeaders)
  const location = { country, state, district, city, pincode }

  const customer = await createPopupContact({
    authHeaders,
    code: '',
    label: 'sales customer popup contact',
    name: `popup sales customer ${marker}`,
    legalName: `Popup Sales Customer ${marker}`,
    gstin: popupGstin('33AABCS', '1Z5'),
    addressLine1: `Sales billing ${marker}`,
    addressLine2: 'Billing line two',
    location,
  })
  assertTruthy(/^C-\d{4}$/.test(String(customer.code)), 'sales popup customer allocated C code')
  const customerBillingAddress = stringValue(objectValue(arrayValue(customer.addresses, 'sales customer addresses')[0], 'sales billing address').addressLine1, 'sales billing address line')
  const customerShippingAddress = await appendPopupContactAddress({ authHeaders, contact: customer, label: 'sales shipping popup address', addressLine1: `Sales shipping ${marker}`, addressLine2: 'Shipping line two', location })

  const supplier = await createPopupContact({
    authHeaders,
    code: 'S-0001',
    label: 'purchase supplier popup contact',
    name: `popup purchase supplier ${marker}`,
    legalName: `Popup Purchase Supplier ${marker}`,
    gstin: popupGstin('33AABCP', '1Z6'),
    addressLine1: `Purchase billing ${marker}`,
    addressLine2: 'Supplier billing line two',
    location,
  })
  assertEqual(supplier.code, 'S-0001', 'purchase popup supplier S code')
  const supplierBillingAddress = stringValue(objectValue(arrayValue(supplier.addresses, 'purchase supplier addresses')[0], 'purchase billing address').addressLine1, 'purchase billing address line')
  const supplierShippingAddress = await appendPopupContactAddress({ authHeaders, contact: supplier, label: 'purchase shipping popup address', addressLine1: `Purchase shipping ${marker}`, addressLine2: 'Supplier shipping line two', location })

  const transport = await createCommonRecord('transports', {
    name: `Popup Transport ${marker}`,
    gst: popupGstin('33AABCT', '1Z7'),
    vehicle_no: 'TN39AB1234',
    address: `Transport address ${marker}`,
    contact_no: '9999999999',
    contact_person: `Transport Person ${marker}`,
    is_active: true,
  }, authHeaders)
  assertEqual(transport.name, `Popup Transport ${marker}`, 'transport popup create name')

  const hsn = await createCommonRecord('hsnCodes', { code: `HSN${marker.slice(-4)}`.toUpperCase(), description: `Popup HSN ${marker}`, is_active: true }, authHeaders)
  const unit = await createCommonRecord('units', { name: `Popup Unit ${marker}`, is_active: true }, authHeaders)
  const tax = await createCommonRecord('taxes', { rate_percent: 12, description: `Popup Tax ${marker}`, is_active: true }, authHeaders)
  const product = await createProductMaster({ authHeaders, hsn, unit, tax })
  const order = await createOrderMaster(authHeaders)

  const salesLedger = `Popup Sales Ledger ${marker}`
  const sales = await postJson('/api/v1/entries/sales/upsert', {
    ...entryPayload('invoice_no', `SAL-POP-${marker}`, 'customer_name', String(customer.name), 'invoice_date', today, { accounting_posting_mode: 'none' }),
    customer_id: String(customer.uuid),
    customer_gstin: customer.gstin,
    billing_address: customerBillingAddress,
    shipping_address: customerShippingAddress,
    source_type: 'order',
    source_ref_no: String(order.code),
    accounting_category: salesLedger,
    transport_id: String(transport.uuid ?? transport.id),
    transport_name: transport.name,
    transport_gst: transport.gst,
    transport_address: transport.address,
    transport_contact_no: transport.contact_no,
    transport_contact_person: transport.contact_person,
    vehicle_no: transport.vehicle_no,
    items: [entryItemFromPopupMasters(product, hsn, unit, tax, order)],
  }, authHeaders)
  assertOk(sales, 'sales popup-backed create')
  const salesEntry = objectValue(sales.entry, 'sales popup-backed entry')
  const salesUuid = stringValue(salesEntry.uuid, 'sales popup-backed uuid')
  assertSalesPurchasePopupEntry(salesEntry, { label: 'sales', partyIdKey: 'customer_id', partyNameKey: 'customer_name', partyName: String(customer.name), partyUuid: String(customer.uuid), billingAddress: customerBillingAddress, shippingAddress: customerShippingAddress, transport, product, hsn, unit, tax, accountingCategory: salesLedger, sourceRefNo: String(order.code) })
  assertEmptyComplianceFields(salesEntry, 'sales popup-backed create')
  const fetchedSales = objectValue(await getJson(`/api/v1/entries/sales/${encodeURIComponent(salesUuid)}`, authHeaders), 'sales popup-backed fetched')
  assertSalesPurchasePopupEntry(fetchedSales, { label: 'sales fetched', partyIdKey: 'customer_id', partyNameKey: 'customer_name', partyName: String(customer.name), partyUuid: String(customer.uuid), billingAddress: customerBillingAddress, shippingAddress: customerShippingAddress, transport, product, hsn, unit, tax, accountingCategory: salesLedger, sourceRefNo: String(order.code) })

  const purchaseLedger = `Popup Purchase Ledger ${marker}`
  const purchase = await postJson('/api/v1/entries/purchase/upsert', {
    ...entryPayload('entry_no', `PUR-POP-${marker}`, 'supplier_name', String(supplier.name), 'entry_date', today, { accounting_posting_mode: 'none' }),
    supplier_id: String(supplier.uuid),
    supplier_gstin: supplier.gstin,
    supplier_bill_no: `BILL-${marker}`,
    supplier_bill_date: today,
    billing_address: supplierBillingAddress,
    shipping_address: supplierShippingAddress,
    accounting_category: purchaseLedger,
    transport_id: String(transport.uuid ?? transport.id),
    transport_name: transport.name,
    transport_gst: transport.gst,
    transport_address: transport.address,
    transport_contact_no: transport.contact_no,
    transport_contact_person: transport.contact_person,
    vehicle_no: transport.vehicle_no,
    items: [entryItemFromPopupMasters(product, hsn, unit, tax, order)],
  }, authHeaders)
  assertOk(purchase, 'purchase popup-backed create')
  const purchaseEntry = objectValue(purchase.entry, 'purchase popup-backed entry')
  const purchaseUuid = stringValue(purchaseEntry.uuid, 'purchase popup-backed uuid')
  assertSalesPurchasePopupEntry(purchaseEntry, { label: 'purchase', partyIdKey: 'supplier_id', partyNameKey: 'supplier_name', partyName: String(supplier.name), partyUuid: String(supplier.uuid), billingAddress: supplierBillingAddress, shippingAddress: supplierShippingAddress, transport, product, hsn, unit, tax, accountingCategory: purchaseLedger, sourceRefNo: null })
  assertEmptyComplianceFields(purchaseEntry, 'purchase popup-backed create')
  const fetchedPurchase = objectValue(await getJson(`/api/v1/entries/purchase/${encodeURIComponent(purchaseUuid)}`, authHeaders), 'purchase popup-backed fetched')
  assertSalesPurchasePopupEntry(fetchedPurchase, { label: 'purchase fetched', partyIdKey: 'supplier_id', partyNameKey: 'supplier_name', partyName: String(supplier.name), partyUuid: String(supplier.uuid), billingAddress: supplierBillingAddress, shippingAddress: supplierShippingAddress, transport, product, hsn, unit, tax, accountingCategory: purchaseLedger, sourceRefNo: null })
}

async function createPopupContact(input: { authHeaders: Record<string, string>; code: string; label: string; name: string; legalName: string; gstin: string; addressLine1: string; addressLine2: string; location: Record<'country' | 'state' | 'district' | 'city' | 'pincode', Record<string, unknown>> }) {
  const created = await postJson('/api/v1/contacts/upsert', {
    code: input.code,
    name: input.name,
    legal_name: input.legalName,
    gstin: input.gstin,
    is_active: true,
    addresses: [popupAddressPayload(input.addressLine1, input.addressLine2, input.location, true)],
  }, input.authHeaders)
  assertOk(created, `${input.label} create`)
  const contact = objectValue(created.record, `${input.label} record`)
  assertEqual(contact.name, input.name, `${input.label} name`)
  assertEqual(contact.legal_name, input.legalName, `${input.label} legal name capitalization`)
  assertEqual(contact.gstin, input.gstin, `${input.label} gstin`)
  assertContactAddress(contact, input.location)
  return contact
}

async function appendPopupContactAddress(input: { authHeaders: Record<string, string>; contact: Record<string, unknown>; label: string; addressLine1: string; addressLine2: string; location: Record<'country' | 'state' | 'district' | 'city' | 'pincode', Record<string, unknown>> }) {
  const existingAddresses = Array.isArray(input.contact.addresses) ? input.contact.addresses : []
  const updated = await postJson('/api/v1/contacts/upsert', { ...input.contact, uuid: input.contact.uuid, addresses: [...existingAddresses, popupAddressPayload(input.addressLine1, input.addressLine2, input.location, false)] }, input.authHeaders)
  assertOk(updated, `${input.label} append`)
  const contact = objectValue(updated.record, `${input.label} contact`)
  if (!Array.isArray(contact.addresses) || contact.addresses.length < 2) throw new Error(`Expected ${input.label} to persist two addresses, received ${JSON.stringify(contact.addresses)}`)
  const address = objectValue(contact.addresses.find((item) => objectValue(item, `${input.label} address candidate`).addressLine1 === input.addressLine1), `${input.label} appended address`)
  assertEqual(address.addressLine2, input.addressLine2, `${input.label} line two`)
  assertEqual(address.countryId, String(input.location.country.id), `${input.label} country`)
  input.contact.addresses = contact.addresses
  return stringValue(address.addressLine1, `${input.label} text`)
}

function popupAddressPayload(addressLine1: string, addressLine2: string, location: Record<'country' | 'state' | 'district' | 'city' | 'pincode', Record<string, unknown>>, isDefault: boolean) {
  return {
    addressLine1,
    addressLine2,
    countryId: String(location.country.id),
    stateId: String(location.state.id),
    districtId: String(location.district.id),
    cityId: String(location.city.id),
    pincodeId: String(location.pincode.id),
    isDefault,
    isActive: true,
  }
}

async function createProductMaster(input: { authHeaders: Record<string, string>; hsn: Record<string, unknown>; unit: Record<string, unknown>; tax: Record<string, unknown> }) {
  const result = await postJson('/api/v1/products/upsert', { code: `PROD-${marker}`, name: `Popup Product ${marker}`, hsn_code_id: Number(input.hsn.id), unit_id: Number(input.unit.id), tax_id: Number(input.tax.id), is_active: true }, input.authHeaders)
  assertOk(result, 'popup product create')
  const product = objectValue(result.record, 'popup product record')
  assertEqual(product.code, `PROD-${marker}`, 'popup product code')
  assertEqual(product.name, `Popup Product ${marker}`, 'popup product name')
  return product
}

async function createOrderMaster(authHeaders: Record<string, string>) {
  const result = await postJson('/api/v1/orders/upsert', { code: `WO-${marker}`, name: `Popup Work Order ${marker}`, description: `Work order from popup suite ${marker}`, is_active: true }, authHeaders)
  assertOk(result, 'popup work order create')
  const order = objectValue(result.record, 'popup work order record')
  assertEqual(order.code, `WO-${marker}`, 'popup work order code')
  return order
}

function entryItemFromPopupMasters(product: Record<string, unknown>, hsn: Record<string, unknown>, unit: Record<string, unknown>, tax: Record<string, unknown>, order: Record<string, unknown>) {
  return { product_id: String(product.uuid ?? product.id), product_name: String(product.name), description: `Popup item ${marker}`, hsn_code: String(hsn.code), po_no: String(order.code), dc_no: `DC-${marker}`, colour: 'Blue', size: 'L', unit: String(unit.name), quantity: 3, rate: 125, discount_amount: 15, tax_rate: Number(tax.rate_percent) }
}

function assertSalesPurchasePopupEntry(entry: Record<string, unknown>, expected: { label: string; partyIdKey: string; partyNameKey: string; partyName: string; partyUuid: string; billingAddress: string; shippingAddress: string; transport: Record<string, unknown>; product: Record<string, unknown>; hsn: Record<string, unknown>; unit: Record<string, unknown>; tax: Record<string, unknown>; accountingCategory: string; sourceRefNo: string | null }) {
  assertEqual(entry[expected.partyIdKey], expected.partyUuid, `${expected.label} party id`)
  assertEqual(entry[expected.partyNameKey], expected.partyName, `${expected.label} party name`)
  assertEqual(entry.billing_address, expected.billingAddress, `${expected.label} billing address`)
  assertEqual(entry.shipping_address, expected.shippingAddress, `${expected.label} shipping address`)
  assertEqual(entry.transport_id, String(expected.transport.uuid ?? expected.transport.id), `${expected.label} transport id`)
  assertEqual(entry.transport_name, expected.transport.name, `${expected.label} transport name`)
  assertEqual(entry.transport_gst, expected.transport.gst, `${expected.label} transport gst`)
  assertEqual(entry.transport_address, expected.transport.address, `${expected.label} transport address`)
  assertEqual(entry.transport_contact_no, expected.transport.contact_no, `${expected.label} transport contact no`)
  assertEqual(entry.transport_contact_person, expected.transport.contact_person, `${expected.label} transport contact person`)
  assertEqual(entry.vehicle_no, expected.transport.vehicle_no, `${expected.label} vehicle no`)
  assertEqual(entry.accounting_category, expected.accountingCategory, `${expected.label} custom ledger category`)
  if (expected.sourceRefNo !== null) assertEqual(entry.source_ref_no, expected.sourceRefNo, `${expected.label} source ref no`)
  assertTruthy(Array.isArray(entry.items), `${expected.label} items array`)
  const item = objectValue((entry.items as unknown[])[0], `${expected.label} first item`)
  assertEqual(item.product_id, String(expected.product.uuid ?? expected.product.id), `${expected.label} product id`)
  assertEqual(item.product_name, expected.product.name, `${expected.label} product name`)
  assertEqual(item.hsn_code, expected.hsn.code, `${expected.label} hsn code`)
  assertEqual(item.unit, expected.unit.name, `${expected.label} unit`)
  assertEqual(item.tax_rate, Number(expected.tax.rate_percent), `${expected.label} tax rate`)
  assertEqual(item.po_no, `WO-${marker}`, `${expected.label} work order no`)
  assertEqual(item.dc_no, `DC-${marker}`, `${expected.label} dc no`)
  assertEqual(item.colour, 'Blue', `${expected.label} colour`)
  assertEqual(item.size, 'L', `${expected.label} size`)
}

function assertEmptyComplianceFields(entry: Record<string, unknown>, label: string) {
  assertEqual(entry.irn, null, `${label} no e-invoice irn`)
  assertEqual(entry.ack_no, null, `${label} no e-invoice ack`)
  assertEqual(entry.eway_bill_no, null, `${label} no e-way bill`)
}

function popupGstin(prefix: string, suffix: string) {
  return `${prefix}${marker.slice(-5).toUpperCase().replace(/[^A-Z0-9]/g, '0')}${suffix}`.slice(0, 15)
}

async function mutateCustomerEntry(input: {
  label: string
  path: string
  numberKey: string
  nameKey: string
  createNo: string
  updateNo: string
  createName: string
  updateName: string
  dateKey: string
  date: string
  authHeaders: Record<string, string>
  extra?: Record<string, unknown>
}) {
  const createPayload = entryPayload(input.numberKey, input.createNo, input.nameKey, input.createName, input.dateKey, input.date, input.extra)
  const created = await postJson(`${input.path}/upsert`, createPayload, input.authHeaders)
  assertOk(created, `${input.label} create`)
  const entry = objectValue(created.entry, `${input.label} entry`)
  const uuid = stringValue(entry.uuid, `${input.label} uuid`)
  assertEqual(entry[input.nameKey], input.createName, `${input.label} create name`)

  const updatePayload = {
    ...createPayload,
    uuid,
    [input.numberKey]: input.updateNo,
    [input.nameKey]: input.updateName,
    notes: `Updated ${marker}`,
  }
  const updated = await postJson(`${input.path}/upsert`, updatePayload, input.authHeaders)
  assertOk(updated, `${input.label} update`)
  assertEqual(objectValue(updated.entry, `${input.label} updated entry`)[input.nameKey], input.updateName, `${input.label} update name`)

  const fetched = await getJson(`${input.path}/${encodeURIComponent(uuid)}`, input.authHeaders)
  assertEqual(objectValue(fetched, `${input.label} fetched entry`)[input.nameKey], input.updateName, `${input.label} get updated name`)

  const rows = await getJson(input.path, input.authHeaders)
  assertTruthy(Array.isArray(rows), `${input.label} list is array`)
  assertTruthy((rows as Array<Record<string, unknown>>).some((row) => row.uuid === uuid), `${input.label} appears in list`)
}

async function mutateReceiptAllocation(today: string, authHeaders: Record<string, string>) {
  const invoiceNo = `SAL-ALLOC-${marker}`
  const sale = await postJson('/api/v1/entries/sales/upsert', entryPayload(
    'invoice_no',
    invoiceNo,
    'customer_name',
    `Allocation Customer ${marker}`,
    'invoice_date',
    today,
    { accounting_posting_mode: 'none', status: 'posted' },
  ), authHeaders)
  assertOk(sale, 'receipt allocation source sales create')
  const saleEntry = objectValue(sale.entry, 'receipt allocation source sales entry')
  const saleUuid = stringValue(saleEntry.uuid, 'receipt allocation source sales uuid')
  assertEqual(saleEntry.status, 'posted', 'receipt allocation source sales posted')

  const created = await postJson('/api/v1/entries/receipt/upsert', {
    company_id: companyId,
    accounting_year_id: accountingYearId,
    receipt_no: `RCT-${marker}`,
    receipt_date: today,
    party_name: `Allocation Customer ${marker}`,
    receipt_mode: 'cash',
    amount: 120,
    status: 'draft',
    notes: `Receipt allocation create ${marker}`,
    allocations: [
      {
        document_type: 'sales',
        document_id: saleUuid,
        document_no: invoiceNo,
        document_total: 200,
        previous_balance: 200,
        allocated_amount: 80,
      },
    ],
  }, authHeaders)
  assertOk(created, 'receipt allocation create')
  const createdEntry = objectValue(created.entry, 'receipt allocation entry')
  const receiptUuid = stringValue(createdEntry.uuid, 'receipt allocation uuid')
  assertEqual(createdEntry.allocated_amount, 80, 'receipt allocated amount create')
  assertEqual(createdEntry.unallocated_amount, 40, 'receipt unallocated amount create')
  assertAllocation(objectValue(created.entry, 'receipt allocation created entry'), invoiceNo, 80, 120, 'receipt create allocation')

  const updated = await postJson('/api/v1/entries/receipt/upsert', {
    uuid: receiptUuid,
    company_id: companyId,
    accounting_year_id: accountingYearId,
    receipt_no: `RCT-${marker}`,
    receipt_date: today,
    party_name: `Allocation Customer ${marker}`,
    receipt_mode: 'cash',
    amount: 150,
    status: 'posted',
    notes: `Receipt allocation update ${marker}`,
    allocations: [
      {
        document_type: 'sales',
        document_id: saleUuid,
        document_no: invoiceNo,
        document_total: 200,
        previous_balance: 200,
        allocated_amount: 120,
      },
    ],
  }, authHeaders)
  assertOk(updated, 'receipt allocation update')
  assertEqual(objectValue(updated.entry, 'receipt allocation updated entry').allocated_amount, 120, 'receipt allocated amount update')
  assertAllocation(objectValue(updated.entry, 'receipt allocation updated entry'), invoiceNo, 120, 80, 'receipt update allocation')

  const fetched = await getJson(`/api/v1/entries/receipt/${encodeURIComponent(receiptUuid)}`, authHeaders)
  assertAllocation(objectValue(fetched, 'receipt fetched allocation entry'), invoiceNo, 120, 80, 'receipt fetched allocation')

  await expectPostFailure('/api/v1/entries/receipt/upsert', {
    company_id: companyId,
    accounting_year_id: accountingYearId,
    receipt_no: `RCT-OVER-${marker}`,
    receipt_date: today,
    party_name: `Allocation Customer ${marker}`,
    receipt_mode: 'cash',
    amount: 100,
    status: 'posted',
    allocations: [
      {
        document_type: 'sales',
        document_id: saleUuid,
        document_no: invoiceNo,
        document_total: 200,
        previous_balance: 80,
        allocated_amount: 90,
      },
    ],
  }, authHeaders, 'exceeds open balance')
}

async function mutatePaymentAllocation(today: string, authHeaders: Record<string, string>) {
  const entryNo = `PUR-ALLOC-${marker}`
  const purchase = await postJson('/api/v1/entries/purchase/upsert', entryPayload(
    'entry_no',
    entryNo,
    'supplier_name',
    `Allocation Supplier ${marker}`,
    'entry_date',
    today,
    { accounting_posting_mode: 'none', status: 'posted' },
  ), authHeaders)
  assertOk(purchase, 'payment allocation source purchase create')
  const purchaseEntry = objectValue(purchase.entry, 'payment allocation source purchase entry')
  const purchaseUuid = stringValue(purchaseEntry.uuid, 'payment allocation source purchase uuid')
  assertEqual(purchaseEntry.status, 'posted', 'payment allocation source purchase posted')

  const created = await postJson('/api/v1/entries/payment/upsert', {
    company_id: companyId,
    accounting_year_id: accountingYearId,
    payment_no: `PAY-${marker}`,
    payment_date: today,
    party_name: `Allocation Supplier ${marker}`,
    payment_mode: 'cash',
    amount: 120,
    status: 'draft',
    notes: `Payment allocation create ${marker}`,
    allocations: [
      {
        document_type: 'purchase',
        document_id: purchaseUuid,
        document_no: entryNo,
        document_total: 200,
        previous_balance: 200,
        allocated_amount: 70,
      },
    ],
  }, authHeaders)
  assertOk(created, 'payment allocation create')
  const createdEntry = objectValue(created.entry, 'payment allocation entry')
  const paymentUuid = stringValue(createdEntry.uuid, 'payment allocation uuid')
  assertEqual(createdEntry.allocated_amount, 70, 'payment allocated amount create')
  assertEqual(createdEntry.unallocated_amount, 50, 'payment unallocated amount create')
  assertAllocation(createdEntry, entryNo, 70, 130, 'payment create allocation')

  const updated = await postJson('/api/v1/entries/payment/upsert', {
    uuid: paymentUuid,
    company_id: companyId,
    accounting_year_id: accountingYearId,
    payment_no: `PAY-${marker}`,
    payment_date: today,
    party_name: `Allocation Supplier ${marker}`,
    payment_mode: 'cash',
    amount: 160,
    status: 'posted',
    notes: `Payment allocation update ${marker}`,
    allocations: [
      {
        document_type: 'purchase',
        document_id: purchaseUuid,
        document_no: entryNo,
        document_total: 200,
        previous_balance: 200,
        allocated_amount: 130,
      },
    ],
  }, authHeaders)
  assertOk(updated, 'payment allocation update')
  assertEqual(objectValue(updated.entry, 'payment allocation updated entry').allocated_amount, 130, 'payment allocated amount update')
  assertAllocation(objectValue(updated.entry, 'payment allocation updated entry'), entryNo, 130, 70, 'payment update allocation')

  const fetched = await getJson(`/api/v1/entries/payment/${encodeURIComponent(paymentUuid)}`, authHeaders)
  assertAllocation(objectValue(fetched, 'payment fetched allocation entry'), entryNo, 130, 70, 'payment fetched allocation')

  await expectPostFailure('/api/v1/entries/payment/upsert', {
    company_id: companyId,
    accounting_year_id: accountingYearId,
    payment_no: `PAY-OVER-${marker}`,
    payment_date: today,
    party_name: `Allocation Supplier ${marker}`,
    payment_mode: 'cash',
    amount: 100,
    status: 'posted',
    allocations: [
      {
        document_type: 'purchase',
        document_id: purchaseUuid,
        document_no: entryNo,
        document_total: 200,
        previous_balance: 70,
        allocated_amount: 80,
      },
    ],
  }, authHeaders, 'exceeds open balance')
}

function entryPayload(
  numberKey: string,
  numberValue: string,
  nameKey: string,
  nameValue: string,
  dateKey: string,
  dateValue: string,
  extra: Record<string, unknown> = {},
) {
  return {
    company_id: companyId,
    accounting_year_id: accountingYearId,
    [numberKey]: numberValue,
    [dateKey]: dateValue,
    [nameKey]: nameValue,
    place_of_supply: 'cgst-sgst',
    status: 'draft',
    paid_amount: 0,
    notes: `Created ${marker}`,
    items: [
      {
        product_name: `Item ${marker}`,
        quantity: 2,
        rate: 100,
        discount_amount: 0,
        tax_rate: 0,
        unit: 'Nos',
      },
    ],
    ...extra,
  }
}

async function seedAdmin() {
  const result = await getDatabase()
    .insertInto('admin_users')
    .values({
      name: 'Billing API Mutation E2E Admin',
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      role: 'super-admin',
      status: 'active',
      updated_at: '2000-01-01 00:00:00',
    })
    .executeTakeFirst()
  adminUserId = Number(result.insertId)
}

async function seedTenant() {
  const codeRow = await getDatabase().selectFrom('tenants').select((eb) => eb.fn.max<number>('code').as('maxCode')).executeTakeFirst()
  const code = Math.max(99, Number(codeRow?.maxCode ?? 99)) + 1

  await getDatabase()
    .insertInto('tenants')
    .values({
      code,
      corporate_id: `E2E_${tenantSlug}`.toUpperCase(),
      mobile: null,
      slug: tenantSlug,
      name: `Billing E2E Tenant ${marker}`,
      status: 'active',
      db_type: 'mariadb',
      db_host: dbConfig.tenant.defaults.host,
      db_port: dbConfig.tenant.defaults.port,
      db_name: `${tenantSlug}_db`,
      db_user: dbConfig.tenant.defaults.user,
      db_secret_ref: dbConfig.tenant.defaults.secretRef,
      payload_settings: JSON.stringify({ apps: { enabled: ['billing'], landing: 'billing' }, e2e: marker }),
      company_count: 0,
      active_company_count: 0,
      company_concept_count: 0,
    })
    .execute()

  const row = await getDatabase().selectFrom('tenants').selectAll().where('slug', '=', tenantSlug).executeTakeFirst()
  if (!row) throw new Error('Failed to seed Billing API mutation tenant.')
  return row
}

async function defaultTenantContextIds() {
  if (!tenant) throw new Error('Tenant must be seeded before resolving context ids.')
  const database = getTenantDatabase(tenant as never) as any
  const row = await database
    .selectFrom('default_companies')
    .select(['company_id', 'accounting_year_id'])
    .where('is_active', '=', true)
    .orderBy('id', 'asc')
    .executeTakeFirst()

  const fallbackCompany = row?.company_id
    ? null
    : await database.selectFrom('companies').select('id').where('is_primary', '=', true).executeTakeFirst()
  const fallbackYear = row?.accounting_year_id
    ? null
    : await database.selectFrom('accounting_years').select('id').where('is_active', '=', true).orderBy('start_date', 'desc').executeTakeFirst()

  const resolvedCompanyId = Number(row?.company_id ?? fallbackCompany?.id ?? 0)
  const resolvedAccountingYearId = Number(row?.accounting_year_id ?? fallbackYear?.id ?? 0)
  if (!resolvedCompanyId || !resolvedAccountingYearId) {
    throw new Error(`Expected provisioned tenant company/accounting year, received ${resolvedCompanyId}/${resolvedAccountingYearId}`)
  }
  return { companyId: resolvedCompanyId, accountingYearId: resolvedAccountingYearId }
}

async function ensureDefaultMoneyLedgers() {
  if (!tenant) throw new Error('Tenant must be seeded before ensuring ledgers.')
  const database = getTenantDatabase(tenant as never) as any
  await database
    .insertInto('account_ledgers')
    .values([
      {
        uuid: `cash_${marker}`,
        tenant_id: Number(tenant.id),
        company_id: companyId,
        accounting_year_id: accountingYearId,
        path: `e2e/${marker}/cash`,
        account_type: 'cash',
        code: `CASH_${marker}`.slice(0, 80),
        name: `Cash ${marker}`,
        opening_balance: 0,
        current_balance: 0,
        status: 'active',
        is_active: true,
      },
      {
        uuid: `bank_${marker}`,
        tenant_id: Number(tenant.id),
        company_id: companyId,
        accounting_year_id: accountingYearId,
        path: `e2e/${marker}/bank`,
        account_type: 'bank',
        code: `BANK_${marker}`.slice(0, 80),
        name: `Bank ${marker}`,
        opening_balance: 0,
        current_balance: 0,
        status: 'active',
        is_active: true,
      },
    ])
    .execute()
}

async function cleanupMutationRows() {
  const database = getDatabase()
  if (tenant) {
    await closeTenantDatabase(tenant as never)
    await dropTenantDatabase(tenant as never)
  }
  await database.deleteFrom('tenants').where('slug', '=', tenantSlug).execute()
  await database.deleteFrom('admin_users').where('email', '=', adminEmail).execute()
}

async function cleanupStaleMutationRows() {
  const database = getDatabase()
  await database.deleteFrom('tenants').where('slug', 'like', 'billing_e2e_%').execute()
  await database.deleteFrom('admin_users').where('email', 'like', 'billing_e2e_%@example.test').execute()
}

async function postJson(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const response = await fetch(`${runtime.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Expected POST ${path} to return 2xx, received ${response.status}: ${await response.text()}`)
  return await response.json() as Record<string, unknown>
}

async function getJson(path: string, headers: Record<string, string> = {}) {
  const response = await fetch(`${runtime.url}${path}`, { headers })
  if (!response.ok) throw new Error(`Expected GET ${path} to return 2xx, received ${response.status}: ${await response.text()}`)
  return await response.json() as Record<string, unknown> | Array<Record<string, unknown>>
}

async function expectPostFailure(path: string, body: Record<string, unknown>, headers: Record<string, string>, expectedMessage: string) {
  const response = await fetch(`${runtime.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (response.ok) throw new Error(`Expected POST ${path} to fail, received ${response.status}.`)
  const text = await response.text()
  if (!text.includes(expectedMessage)) throw new Error(`Expected POST ${path} failure to include ${expectedMessage}, received ${response.status}: ${text}`)
}

function assertAllocation(entry: Record<string, unknown>, documentNo: string, allocatedAmount: number, balanceAfterAllocation: number, label: string) {
  const allocations = entry.allocations
  if (!Array.isArray(allocations)) throw new Error(`Expected ${label} allocations array, received ${JSON.stringify(allocations)}`)
  const allocation = allocations.find((row) => objectValue(row, `${label} allocation row`).document_no === documentNo)
  if (!allocation) throw new Error(`Expected ${label} allocation for ${documentNo}, received ${JSON.stringify(allocations)}`)
  const row = objectValue(allocation, `${label} allocation`)
  assertEqual(row.allocated_amount, allocatedAmount, `${label} allocated amount`)
  assertEqual(row.balance_after_allocation, balanceAfterAllocation, `${label} balance after allocation`)
}

function assertOk(value: Record<string, unknown>, label: string) {
  if (value.ok !== true) throw new Error(`Expected ${label} ok, received ${JSON.stringify(value)}`)
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`Expected ${label} ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
}

async function tenantTableExists(database: ReturnType<typeof getTenantDatabase>, tableName: string) {
  const result = await sql<{ table_count: number | string | bigint }>`
    SELECT COUNT(*) AS table_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
  `.execute(database as never)
  return Number(result.rows[0]?.table_count ?? 0) > 0
}

function assertTruthy(value: unknown, label: string) {
  if (!value) throw new Error(`Expected ${label}`)
}

function objectValue(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected ${label} object, received ${JSON.stringify(value)}`)
  return value as Record<string, unknown>
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected ${label} array, received ${JSON.stringify(value)}`)
  return value
}

function stringValue(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Expected ${label} string, received ${JSON.stringify(value)}`)
  return value
}
