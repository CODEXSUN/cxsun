import '../billing-api.contract.test.js'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const moduleSource = readFileSync(resolve('src/billing-api.module.ts'), 'utf8')

if (!moduleSource.includes("./modules/stock/ledger/index.js")) {
  throw new Error('Billing API must mount the native stock ledger module.')
}

if (moduleSource.includes("@cxsun/platform/modules/stock/ledger/index.js")) {
  throw new Error('Billing API must not mount the compatibility server stock ledger module.')
}

console.log('Stock ledger module contract ok: native Billing API stock ledger module is mounted.')
