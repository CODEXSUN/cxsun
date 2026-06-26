import '../billing-api.contract.test.js'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const moduleSource = readFileSync(resolve('src/billing-api.module.ts'), 'utf8')

if (!moduleSource.includes("./modules/entries/quotation/index.js")) {
  throw new Error('Billing API must mount the native quotation module.')
}

if (moduleSource.includes("@cxsun/platform/modules/entries/quotation/index.js")) {
  throw new Error('Billing API must not mount the compatibility server quotation module.')
}

console.log('Quotation module contract ok: native Billing API quotation module is mounted.')
