import '../billing-api.contract.test.js'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const moduleSource = readFileSync(resolve('src/billing-api.module.ts'), 'utf8')

if (!moduleSource.includes("./modules/entries/sales/index.js")) {
  throw new Error('Billing API must mount the native sales module.')
}

if (moduleSource.includes("@cxsun/platform/modules/entries/sales/index.js")) {
  throw new Error('Billing API must not mount the compatibility server sales module.')
}

console.log('Sales module contract ok: native Billing API sales module is mounted.')
